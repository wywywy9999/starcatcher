import base64
import hashlib
import struct
import time

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad


class WXBizMsgCrypt:
    def __init__(self, token: str, encoding_aes_key: str, corp_id: str):
        self.token = token
        self.corp_id = corp_id
        self.key = base64.b64decode(encoding_aes_key + "=")  # 43→44→32 bytes

    def verify_url(self, msg_signature: str, timestamp: str, nonce: str, echostr: str) -> str:
        """验证URL，返回解密后的 echostr"""
        sig = self._signature(self.token, timestamp, nonce, echostr)
        if sig != msg_signature:
            raise ValueError("签名验证失败")
        return self._decrypt(echostr)

    def decrypt_msg(self, msg_signature: str, timestamp: str, nonce: str, post_data: str) -> str:
        """解密消息，返回明文 XML"""
        sig = self._signature(self.token, timestamp, nonce, post_data)
        if sig != msg_signature:
            raise ValueError("签名验证失败")
        return self._decrypt(post_data)

    def encrypt_msg(self, msg: str) -> str:
        """加密回复消息"""
        return self._encrypt(msg)

    def _signature(self, token: str, timestamp: str, nonce: str, encrypt: str) -> str:
        sort_list = sorted([token, timestamp, nonce, encrypt])
        sha = hashlib.sha1("".join(sort_list).encode())
        return sha.hexdigest()

    def _decrypt(self, text: str) -> str:
        cipher = AES.new(self.key, AES.MODE_CBC, iv=self.key[:16])
        plain = unpad(cipher.decrypt(base64.b64decode(text)), 32)
        content = plain[16:]  # skip random 16 bytes
        xml_len = struct.unpack(">I", content[:4])[0]  # network byte order
        xml_content = content[4:4 + xml_len].decode("utf-8")
        # 验证 corpid
        from_id = content[4 + xml_len:].decode("utf-8")
        if from_id != self.corp_id:
            raise ValueError(f"CorpID 不匹配: expected {self.corp_id}, got {from_id}")
        return xml_content

    def _encrypt(self, msg: str) -> str:
        random_bytes = struct.pack("I", int(time.time() * 1000) & 0xFFFFFFFF)[:16]
        msg_bytes = msg.encode("utf-8")
        msg_len = struct.pack(">I", len(msg_bytes))
        plain = random_bytes + msg_len + msg_bytes + self.corp_id.encode("utf-8")
        cipher = AES.new(self.key, AES.MODE_CBC, iv=self.key[:16])
        return base64.b64encode(cipher.encrypt(pad(plain, 32))).decode()
