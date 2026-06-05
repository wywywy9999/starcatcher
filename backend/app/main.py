from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import bookmarks, collections, stats, categories as cat_routes, tags as tag_routes, webhook

app = FastAPI(title="StarCatcher", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bookmarks.router, prefix="/api/v1")
app.include_router(collections.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(cat_routes.router, prefix="/api/v1")
app.include_router(tag_routes.router, prefix="/api/v1")
app.include_router(webhook.router)  # /webhook/wechat 不走 /api/v1


@app.on_event("startup")
def on_startup():
    init_db()
    _seed_categories()


def _seed_categories():
    from app.database import SessionLocal
    from app.models import Category

    db = SessionLocal()
    try:
        defaults = [
            ("tech", "💻", 1, "技术"),
            ("science", "🔬", 2, "科学"),
            ("business", "💼", 3, "商业"),
            ("design", "🎨", 4, "设计"),
            ("reading", "📖", 5, "阅读"),
            ("video", "🎬", 6, "视频"),
            ("tool", "🛠️", 7, "工具"),
            ("life", "🌟", 8, "生活"),
            ("other", "📌", 9, "其他"),
        ]
        for slug, icon, order, name in defaults:
            if not db.query(Category).filter(Category.slug == slug).first():
                db.add(Category(name=name, slug=slug, icon=icon, sort_order=order))
        db.commit()
    finally:
        db.close()
