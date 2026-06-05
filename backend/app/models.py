import hashlib
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse

from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


bookmark_tags = Table(
    "bookmark_tags",
    Base.metadata,
    Column("bookmark_id", ForeignKey("bookmarks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

bookmark_categories = Table(
    "bookmark_categories",
    Base.metadata,
    Column("bookmark_id", ForeignKey("bookmarks.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    url_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(500))
    summary: Mapped[Optional[str]] = mapped_column(Text)
    full_summary: Mapped[Optional[str]] = mapped_column(Text)
    content_snippet: Mapped[Optional[str]] = mapped_column(Text)
    domain: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    favicon_url: Mapped[Optional[str]] = mapped_column(String(2048))
    collection_id: Mapped[Optional[int]] = mapped_column(ForeignKey("collections.id", ondelete="SET NULL"))
    is_pinned: Mapped[bool] = mapped_column(default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[Optional[str]] = mapped_column(Text)
    annotations: Mapped[Optional[str]] = mapped_column(Text)  # JSON: [{"quote":"...", "comment":"..."}]
    author: Mapped[Optional[str]] = mapped_column(String(255))
    published_at: Mapped[Optional[str]] = mapped_column(String(30))
    word_count: Mapped[Optional[int]] = mapped_column(Integer)
    reading_time_min: Mapped[Optional[int]] = mapped_column(Integer)
    use_ai: Mapped[bool] = mapped_column(default=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    scraped_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    categories: Mapped[list["Category"]] = relationship(secondary=bookmark_categories, back_populates="bookmarks", lazy="selectin")
    collection: Mapped[Optional["Collection"]] = relationship(back_populates="bookmarks")
    tags: Mapped[list["Tag"]] = relationship(secondary=bookmark_tags, back_populates="bookmarks", lazy="selectin")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(10))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    bookmarks: Mapped[list["Bookmark"]] = relationship(secondary=bookmark_categories, back_populates="categories", lazy="selectin")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    bookmarks: Mapped[list["Bookmark"]] = relationship(secondary=bookmark_tags, back_populates="tags", lazy="selectin")


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    bookmarks: Mapped[list["Bookmark"]] = relationship(back_populates="collection", lazy="dynamic")


class AIUsageLog(Base):
    __tablename__ = "ai_usage_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    bookmark_id: Mapped[Optional[int]] = mapped_column(ForeignKey("bookmarks.id", ondelete="SET NULL"))
    operation: Mapped[str] = mapped_column(String(30))
    model: Mapped[str] = mapped_column(String(50))
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


def normalize_url(url: str) -> str:
    """去除追踪参数，标准化URL用于去重"""
    parsed = urlparse(url)
    # 去掉 utm_*, fbclid, ref 等追踪参数
    query = re.sub(r'(^|&)(utm_\w+|fbclid|ref|source|mc_cid|mc_eid)=[^&]*', '', parsed.query)
    query = query.lstrip('&')
    # 标准化: 小写scheme+host, 去末尾斜杠
    normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/') or '/'}"
    if query:
        normalized += f"?{query}"
    return normalized


def hash_url(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def extract_domain(url: str) -> str:
    return urlparse(url).netloc.replace("www.", "")
