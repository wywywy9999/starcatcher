from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ─── Request schemas ───

class BookmarkCreate(BaseModel):
    url: str
    use_ai: bool = True
    title: Optional[str] = None
    summary: Optional[str] = None
    full_summary: Optional[str] = None
    collection_id: Optional[int] = None
    category_ids: Optional[list[int]] = None


class BookmarkUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    full_summary: Optional[str] = None
    category_ids: Optional[list[int]] = None
    collection_id: Optional[int] = None
    note: Optional[str] = None
    tags: Optional[list[str]] = None
    annotations: Optional[str] = None
    is_pinned: Optional[bool] = None


class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None


# ─── Response schemas ───

class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    icon: Optional[str] = None
    bookmark_count: int = 0

    model_config = {"from_attributes": True}


class TagOut(BaseModel):
    id: int
    name: str
    slug: str
    bookmark_count: int = 0

    model_config = {"from_attributes": True}


class CollectionOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    bookmark_count: int = 0

    model_config = {"from_attributes": True}


class BookmarkOut(BaseModel):
    id: int
    url: str
    title: Optional[str] = None
    summary: Optional[str] = None
    domain: Optional[str] = None
    favicon_url: Optional[str] = None
    categories: list[CategoryOut] = []
    collection: Optional[CollectionOut] = None
    tags: list[TagOut] = []
    note: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None
    word_count: Optional[int] = None
    reading_time_min: Optional[int] = None
    use_ai: bool = True
    is_pinned: bool = False
    annotations: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookmarkDetail(BookmarkOut):
    full_summary: Optional[str] = None
    content_snippet: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int


class StatsOut(BaseModel):
    total_bookmarks: int
    bookmarks_this_week: int
    by_category: list[dict]
    total_ai_cost: float
