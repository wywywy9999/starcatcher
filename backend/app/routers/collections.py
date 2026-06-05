from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Collection, Bookmark
from app.schemas import CollectionCreate

router = APIRouter(prefix="/collections", tags=["collections"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _collection_out(c: Collection) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "created_at": c.created_at,
        "bookmark_count": c.bookmarks.count(),
    }


@router.get("/")
def list_collections(db: Session = Depends(get_db)):
    collections = db.query(Collection).order_by(Collection.name).all()
    return [_collection_out(c) for c in collections]


@router.post("/", status_code=201)
def create_collection(body: CollectionCreate, db: Session = Depends(get_db)):
    existing = db.query(Collection).filter(Collection.name == body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="同名集合已存在")
    collection = Collection(name=body.name, description=body.description)
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return _collection_out(collection)


@router.delete("/{collection_id}", status_code=204)
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    collection = db.query(Collection).get(collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="集合不存在")
    # 把该集合下的书签设为无集合
    db.query(Bookmark).filter(Bookmark.collection_id == collection_id).update(
        {Bookmark.collection_id: None})
    db.delete(collection)
    db.commit()
