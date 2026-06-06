import csv
import io
import threading
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Bookmark, Category, Tag, Collection, AIUsageLog, bookmark_tags as bt, \
    extract_domain, hash_url, normalize_url
from app.schemas import (
    BookmarkCreate, BookmarkUpdate, BookmarkOut, BookmarkDetail,
    PaginatedResponse,
)
from app.services.bookmark_service import process_bookmark, create_bookmark_manual

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _bookmark_out(b: Bookmark) -> dict:
    """转为 BookmarkOut 字典"""
    return {
        "id": b.id,
        "url": b.url,
        "title": b.title,
        "summary": b.summary,
        "domain": b.domain,
        "favicon_url": b.favicon_url,
        "categories": [{"id": c.id, "name": c.name, "slug": c.slug, "icon": c.icon,
                         "bookmark_count": 0} for c in b.categories],
        "collection": {
            "id": b.collection.id,
            "name": b.collection.name,
            "description": b.collection.description,
            "created_at": b.collection.created_at,
            "bookmark_count": b.collection.bookmarks.count(),
        } if b.collection else None,
        "tags": [{"id": t.id, "name": t.name, "slug": t.slug,
                  "bookmark_count": len(t.bookmarks)} for t in b.tags],
        "note": b.note,
        "author": b.author,
        "published_at": b.published_at,
        "word_count": b.word_count,
        "reading_time_min": b.reading_time_min,
        "use_ai": b.use_ai,
        "is_pinned": b.is_pinned,
        "annotations": b.annotations,
        "status": b.status,
        "error_message": b.error_message,
        "created_at": b.created_at,
        "updated_at": b.updated_at,
    }


def _bookmark_detail(b: Bookmark) -> dict:
    d = _bookmark_out(b)
    d["full_summary"] = b.full_summary
    d["content_snippet"] = b.content_snippet
    return d


@router.post("/", status_code=202)
def create_bookmark(body: BookmarkCreate, db: Session = Depends(get_db)):
    """提交书签。use_ai=true 走自动抓取+AI，false 走手动模式"""

    # 笔记模式：无 URL，直接保存
    if not body.url.strip():
        if not body.title:
            raise HTTPException(status_code=400, detail="标题不能为空")
        import uuid
        bookmark = Bookmark(
            url="", url_hash=f"note-{uuid.uuid4()}", domain="", title=body.title,
            summary=body.summary or body.title,
            full_summary=body.full_summary or body.summary or "",
            use_ai=False, status="ready", content_snippet=body.full_summary or "",
        )
        db.add(bookmark)
        db.commit()
        db.refresh(bookmark)
        if body.category_ids:
            for cid in body.category_ids:
                cat = db.query(Category).get(cid)
                if cat: bookmark.categories.append(cat)
            db.commit()
        return _bookmark_out(bookmark)

    norm = normalize_url(body.url)
    url_hash = hash_url(norm)

    # 去重检查
    existing = db.query(Bookmark).filter(Bookmark.url_hash == url_hash).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"URL已存在 (书签 #{existing.id})")

    if not body.use_ai:
        # 手动模式：直接保存
        if not body.title or not body.summary:
            raise HTTPException(status_code=400, detail="手动模式需要提供 title 和 summary")
        bookmark = create_bookmark_manual(db, body.url, body.title, body.summary, body.collection_id)
        if body.category_ids:
            for cid in body.category_ids:
                cat = db.query(Category).get(cid)
                if cat: bookmark.categories.append(cat)
            db.commit()
        return _bookmark_out(bookmark)

    # AI 模式：先建记录，后台处理
    domain = extract_domain(body.url)
    bookmark = Bookmark(
        url=body.url, url_hash=url_hash, domain=domain,
        favicon_url=f"https://{domain}/favicon.ico",
        title=body.title,  # 用户可选填标题
        collection_id=body.collection_id,
        use_ai=True, status="pending",
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)

    # 用户预选的分类
    if body.category_ids:
        for cid in body.category_ids:
            cat = db.query(Category).get(cid)
            if cat: bookmark.categories.append(cat)
        db.commit()

    # 后台线程处理
    def _run():
        bg_db = SessionLocal()
        try:
            process_bookmark(bookmark.id, bg_db)
        finally:
            bg_db.close()

    threading.Thread(target=_run, daemon=True).start()

    return _bookmark_out(bookmark)


@router.get("/")
def list_bookmarks(
    status: str = "all",
    category_slug: str | None = Query(None, alias="category"),
    tag: str | None = Query(None, description="逗号分隔的多个标签"),
    collection_id: int | None = Query(None, alias="collection"),
    q: str | None = Query(None),
    page: int = 1,
    page_size: int = 20,
    sort: str = "created_at",
    db: Session = Depends(get_db),
):
    """书签列表，支持筛选/搜索/分页"""
    query = db.query(Bookmark)

    if status != "all":
        query = query.filter(Bookmark.status == status)

    if category_slug:
        query = query.join(Bookmark.categories).filter(Category.slug == category_slug)

    if tag:
        tags_list = [t.strip() for t in tag.split(",") if t.strip()]
        if tags_list:
            query = query.join(Bookmark.tags).filter(Tag.slug.in_(tags_list))

    if collection_id:
        query = query.filter(Bookmark.collection_id == collection_id)

    if q:
        keyword = f"%{q}%"
        query = query.filter(or_(
            Bookmark.title.ilike(keyword),
            Bookmark.summary.ilike(keyword),
            Bookmark.content_snippet.ilike(keyword),
            Bookmark.note.ilike(keyword),
        ))

    # 排序：置顶优先，再按用户选择排序
    sort_map = {"created_at": Bookmark.created_at.desc(), "updated_at": Bookmark.updated_at.desc(),
                "title": Bookmark.title.asc()}
    query = query.order_by(Bookmark.is_pinned.desc(), Bookmark.sort_order.asc(), sort_map.get(sort, Bookmark.created_at.desc()))

    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [_bookmark_out(b) for b in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/{bookmark_id}")
def get_bookmark(bookmark_id: int, db: Session = Depends(get_db)):
    bookmark = db.query(Bookmark).get(bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")
    return _bookmark_detail(bookmark)


@router.patch("/{bookmark_id}")
def update_bookmark(bookmark_id: int, body: BookmarkUpdate, db: Session = Depends(get_db)):
    bookmark = db.query(Bookmark).get(bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")

    for field in ["title", "summary", "full_summary", "collection_id", "note", "annotations", "is_pinned"]:
        val = getattr(body, field, None)
        if val is not None:
            setattr(bookmark, field, val)

    if body.tags is not None:
        bookmark.tags.clear()
        for tag_name in body.tags:
            slug = tag_name.lower().replace(" ", "-")
            tag = db.query(Tag).filter(Tag.slug == slug).first()
            if not tag:
                tag = Tag(name=tag_name, slug=slug)
                db.add(tag)
                db.flush()
            bookmark.tags.append(tag)

    if body.category_ids is not None:
        bookmark.categories.clear()
        for cid in body.category_ids:
            cat = db.query(Category).get(cid)
            if cat:
                bookmark.categories.append(cat)

    db.commit()
    db.refresh(bookmark)
    return _bookmark_out(bookmark)


@router.delete("/{bookmark_id}", status_code=204)
def delete_bookmark(bookmark_id: int, db: Session = Depends(get_db)):
    bookmark = db.query(Bookmark).get(bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")
    db.delete(bookmark)
    db.commit()


@router.post("/{bookmark_id}/retry")
def retry_bookmark(bookmark_id: int, db: Session = Depends(get_db)):
    bookmark = db.query(Bookmark).get(bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")
    if bookmark.status not in ("failed", "pending"):
        raise HTTPException(status_code=400, detail="只能重试失败或待处理的书签")

    bookmark.status = "pending"
    bookmark.error_message = None
    db.commit()

    def _run():
        bg_db = SessionLocal()
        try:
            process_bookmark(bookmark.id, bg_db)
        finally:
            bg_db.close()

    threading.Thread(target=_run, daemon=True).start()
    return _bookmark_out(bookmark)


@router.get("/{bookmark_id}/recommendations")
def get_recommendations(bookmark_id: int, limit: int = 5, db: Session = Depends(get_db)):
    """基于标签重叠推荐相似书签"""
    bookmark = db.query(Bookmark).get(bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="书签不存在")

    if not bookmark.tags:
        return {"items": [], "source": "No tags to base recommendations on"}

    tag_ids = [t.id for t in bookmark.tags]
    # 找拥有相同标签的书签，按重叠数排序
    similar = (
        db.query(Bookmark, func.count(bt.c.tag_id).label("overlap"))
        .join(bt, Bookmark.id == bt.c.bookmark_id)
        .filter(bt.c.tag_id.in_(tag_ids), Bookmark.id != bookmark_id, Bookmark.status == "ready")
        .group_by(Bookmark.id)
        .order_by(func.count(bt.c.tag_id).desc())
        .limit(limit)
        .all()
    )

    return {
        "items": [_bookmark_out(b) for b, _ in similar],
        "source": f"与「{bookmark.title}」标签相似",
    }


@router.post("/batch/delete", status_code=204)
def batch_delete(ids: list[int], db: Session = Depends(get_db)):
    db.query(Bookmark).filter(Bookmark.id.in_(ids)).delete(synchronize_session=False)
    db.commit()


@router.post("/batch/move")
def batch_move(ids: list[int], collection_id: int | None = None, db: Session = Depends(get_db)):
    db.query(Bookmark).filter(Bookmark.id.in_(ids)).update(
        {Bookmark.collection_id: collection_id}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.post("/reorder")
def reorder_bookmarks(items: list[dict], db: Session = Depends(get_db)):
    """接收 [{id, sort_order}, ...]，批量更新排序"""
    for item in items:
        db.query(Bookmark).filter(Bookmark.id == item["id"]).update(
            {"sort_order": item["sort_order"]})
    db.commit()
    return {"ok": True}


@router.post("/batch/export")
def batch_export(ids: list[int], db: Session = Depends(get_db)):
    from datetime import datetime
    bookmarks = db.query(Bookmark).filter(Bookmark.id.in_(ids)).order_by(Bookmark.created_at.desc()).all()
    lines = [f"# StarCatcher 批量导出", f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}", f"共 {len(bookmarks)} 篇", ""]
    for b in bookmarks:
        lines.append(f"## [{b.title or b.url}]({b.url})")
        lines.append(f"**分类**: {', '.join(c.name for c in b.categories) or '无'} | **标签**: {', '.join(t.name for t in b.tags) or '无'}")
        if b.summary: lines.append(f"> {b.summary}")
        if b.note: lines.append(f"笔记: {b.note}")
        if b.full_summary: lines.append(f"正文: {b.full_summary[:200]}")
        lines.append("")
    return {"data": "\n".join(lines)}
