from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Category
from pydantic import BaseModel

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str
    icon: str = "📌"


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _cat_out(c: Category) -> dict:
    return {"id": c.id, "name": c.name, "slug": c.slug, "icon": c.icon,
            "bookmark_count": len(c.bookmarks)}


@router.get("/")
def list_categories(db: Session = Depends(get_db)):
    return [_cat_out(c) for c in db.query(Category).order_by(Category.sort_order).all()]


@router.post("/", status_code=201)
def create_category(body: CategoryCreate, db: Session = Depends(get_db)):
    slug = body.name.lower().replace(" ", "-")
    if db.query(Category).filter(Category.slug == slug).first():
        raise HTTPException(status_code=409, detail="同名分类已存在")

    max_order = db.query(Category).order_by(Category.sort_order.desc()).first()
    cat = Category(name=body.name, slug=slug, icon=body.icon,
                   sort_order=(max_order.sort_order + 1) if max_order else 10)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return _cat_out(cat)


@router.patch("/{category_id}")
def update_category(category_id: int, body: CategoryUpdate, db: Session = Depends(get_db)):
    cat = db.query(Category).get(category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="分类不存在")
    if body.name is not None:
        cat.name = body.name
        cat.slug = body.name.lower().replace(" ", "-")
    if body.icon is not None:
        cat.icon = body.icon
    db.commit()
    db.refresh(cat)
    return _cat_out(cat)


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).get(category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="分类不存在")
    # 多对多关联会通过 CASCADE 自动清理
    db.delete(cat)
    db.commit()
