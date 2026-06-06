from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Bookmark, Category, AIUsageLog

router = APIRouter(tags=["stats"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Bookmark).count()
    week_ago = datetime.utcnow() - timedelta(days=7)
    this_week = db.query(Bookmark).filter(Bookmark.created_at >= week_ago).count()

    by_category = []
    categories = db.query(Category).all()
    for cat in categories:
        count = len(cat.bookmarks)
        if count > 0:
            by_category.append({"category": cat.name, "slug": cat.slug, "count": count})

    total_cost = db.query(func.coalesce(func.sum(AIUsageLog.estimated_cost), 0)).scalar()

    return {
        "total_bookmarks": total,
        "bookmarks_this_week": this_week,
        "by_category": by_category,
        "total_ai_cost": round(float(total_cost), 4),
    }


@router.get("/export")
def export_bookmarks(collection_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Bookmark)
    if collection_id:
        query = query.filter(Bookmark.collection_id == collection_id)
    bookmarks = query.order_by(Bookmark.created_at.desc()).all()

    lines = ["# StarCatcher 导出", f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}", f"共 {len(bookmarks)} 篇", ""]
    for b in bookmarks:
        cat_names = ", ".join(c.name for c in b.categories)
        tag_names = ", ".join(t.name for t in b.tags)
        lines.append(f"## [{b.title or b.url}]({b.url})")
        lines.append(f"**分类**: {cat_names or '无'} | **标签**: {tag_names or '无'}")
        if b.summary:
            lines.append(f"> {b.summary}")
        if b.note:
            lines.append(f"笔记: {b.note}")
        if b.full_summary:
            lines.append(f"正文: {b.full_summary[:200]}")
        lines.append("")
    return {"format": "md", "data": "\n".join(lines)}
