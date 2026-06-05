from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import SessionLocal
from app.models import Tag

router = APIRouter(prefix="/tags", tags=["tags"])


class TagCreate(BaseModel):
    name: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _tag_out(t: Tag) -> dict:
    return {"id": t.id, "name": t.name, "slug": t.slug, "bookmark_count": len(t.bookmarks)}


@router.get("/")
def list_tags(q: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Tag)
    if q:
        query = query.filter(Tag.name.ilike(f"%{q}%"))
    return [_tag_out(t) for t in query.order_by(Tag.name).all()]


@router.post("/", status_code=201)
def create_tag(body: TagCreate, db: Session = Depends(get_db)):
    slug = body.name.lower().replace(" ", "-")
    if db.query(Tag).filter(Tag.slug == slug).first():
        raise HTTPException(status_code=409, detail="同名标签已存在")
    tag = Tag(name=body.name, slug=slug)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return _tag_out(tag)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).get(tag_id)
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")
    db.delete(tag)
    db.commit()
