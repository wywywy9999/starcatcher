import re
import xml.etree.ElementTree as ET

from fastapi import APIRouter, Query, Request, HTTPException
from fastapi.responses import PlainTextResponse

from app.services.wechat_crypto import WXBizMsgCrypt

router = APIRouter(prefix="/webhook", tags=["webhook"])

# 企业微信配置
CORP_ID = "ww4e5c72059c443d3f"
TOKEN = "vfMDdWSQtdd"
AES_KEY = "zATqH2sXQ6KOdn3MF2i2ejs4TxXrrVLbSliQmol83Nf"

crypt = WXBizMsgCrypt(TOKEN, AES_KEY, CORP_ID)


def extract_urls(text: str) -> list[str]:
    """从文本中提取所有URL"""
    pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    return re.findall(pattern, text)


@router.get("/wechat")
def verify_url(
    msg_signature: str = Query(...),
    timestamp: str = Query(...),
    nonce: str = Query(...),
    echostr: str = Query(...),
):
    """企业微信 URL 验证（GET）"""
    try:
        decrypted = crypt.verify_url(msg_signature, timestamp, nonce, echostr)
        return PlainTextResponse(decrypted)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/wechat")
async def receive_message(request: Request):
    """接收企业微信消息（POST）"""
    # 获取查询参数
    params = dict(request.query_params)
    msg_signature = params.get("msg_signature", "")
    timestamp = params.get("timestamp", "")
    nonce = params.get("nonce", "")

    # 读取加密的 XML body
    body = await request.body()
    body_str = body.decode("utf-8")

    try:
        # 解密
        xml_str = crypt.decrypt_msg(msg_signature, timestamp, nonce, body_str)

        # 解析 XML
        root = ET.fromstring(xml_str)
        msg_type = root.findtext("MsgType", "")
        content = root.findtext("Content", "")
        from_user = root.findtext("FromUserName", "")
        to_user = root.findtext("ToUserName", "")

        if msg_type != "text" or not content:
            reply = _build_reply_xml(from_user, to_user, "请发送链接给我，我会帮你收藏并生成摘要。")
            return _encrypt_reply(reply, timestamp, nonce)

        # 提取 URL
        urls = extract_urls(content)
        if not urls:
            reply = _build_reply_xml(from_user, to_user, "未识别到链接，请发送包含 http/https 的网址。")
            return _encrypt_reply(reply, timestamp, nonce)

        # 处理第一个URL
        url = urls[0]
        _save_bookmark(url)

        reply = _build_reply_xml(
            from_user, to_user,
            f"已收到链接！AI 正在分析中，稍后可在 LinkVault 中查看结果。\n\n{url}"
        )
        return _encrypt_reply(reply, timestamp, nonce)

    except Exception as e:
        root = ET.fromstring("<xml></xml>")
        reply = _build_reply_xml("", "", f"处理失败: {str(e)[:100]}")
        return _encrypt_reply(reply, timestamp, nonce)


def _save_bookmark(url: str):
    """保存书签到数据库"""
    from app.database import SessionLocal
    from app.services.bookmark_service import process_bookmark
    from app.models import Bookmark, extract_domain, hash_url, normalize_url
    import threading

    db = SessionLocal()
    try:
        norm = normalize_url(url)
        url_hash = hash_url(norm)
        existing = db.query(Bookmark).filter(Bookmark.url_hash == url_hash).first()
        if existing:
            return

        domain = extract_domain(url)
        bookmark = Bookmark(
            url=url, url_hash=url_hash, domain=domain,
            favicon_url=f"https://{domain}/favicon.ico",
            use_ai=True, status="pending",
        )
        db.add(bookmark)
        db.commit()
        bid = bookmark.id

        def _run():
            bg_db = SessionLocal()
            try:
                process_bookmark(bid, bg_db)
            finally:
                bg_db.close()

        threading.Thread(target=_run, daemon=True).start()
    finally:
        db.close()


def _build_reply_xml(from_user: str, to_user: str, content: str) -> str:
    import time as _time
    return f"""<xml>
<ToUserName><![CDATA[{from_user}]]></ToUserName>
<FromUserName><![CDATA[{to_user}]]></FromUserName>
<CreateTime>{int(_time.time())}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[{content}]]></Content>
</xml>"""


def _encrypt_reply(xml_str: str, timestamp: str, nonce: str) -> PlainTextResponse:
    encrypted = crypt.encrypt_msg(xml_str)
    sig = crypt._signature(TOKEN, timestamp, nonce, encrypted)

    reply = f"""<xml>
<Encrypt><![CDATA[{encrypted}]]></Encrypt>
<MsgSignature><![CDATA[{sig}]]></MsgSignature>
<TimeStamp>{timestamp}</TimeStamp>
<Nonce><![CDATA[{nonce}]]></Nonce>
</xml>"""
    return PlainTextResponse(reply, media_type="application/xml")
