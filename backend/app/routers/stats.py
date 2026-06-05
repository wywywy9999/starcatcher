import csv
import io
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
def export_bookmarks(format: str = "md", collection_id: int | None = None,
                     db: Session = Depends(get_db)):
    query = db.query(Bookmark).filter(Bookmark.status == "ready")
    if collection_id:
        query = query.filter(Bookmark.collection_id == collection_id)
    bookmarks = query.order_by(Bookmark.created_at.desc()).all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["标题", "URL", "摘要", "分类", "标签", "笔记", "日期"])
        for b in bookmarks:
            writer.writerow([
                b.title or "", b.url, b.summary or "",
                b.category.name if b.category else "",
                ", ".join(t.name for t in b.tags),
                b.note or "", b.created_at.isoformat() if b.created_at else "",
            ])
        return {"format": "csv", "data": output.getvalue()}

    # Markdown
    lines = ["# LinkVault 书签导出", f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ""]
    for b in bookmarks:
        lines.append(f"## [{b.title or b.url}]({b.url})")
        if b.summary:
            lines.append(f"> {b.summary}")
        lines.append(f"- 分类: {b.category.name if b.category else '无'}  "
                     f"| 标签: {', '.join(t.name for t in b.tags) or '无'}")
        if b.note:
            lines.append(f"- 笔记: {b.note}")
        lines.append("")
    return {"format": "md", "data": "\n".join(lines)}
