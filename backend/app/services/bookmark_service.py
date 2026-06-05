from sqlalchemy.orm import Session

from app.models import Bookmark, Category, Tag, AIUsageLog, bookmark_tags as bt, extract_domain, hash_url, normalize_url
from app.services.scraper import scrape
from app.services.ai_service import analyze


def process_bookmark(bookmark_id: int, db: Session):
    """后台任务：抓取网页 + AI分析 → 更新书签"""
    bookmark = db.query(Bookmark).get(bookmark_id)
    if not bookmark:
        return

    try:
        # Step 1: 抓取
        bookmark.status = "scraping"
        db.commit()

        scraped = scrape(bookmark.url)
        content = scraped["content"]

        bookmark.title = scraped["title"] or bookmark.title
        bookmark.author = scraped["author"]
        bookmark.published_at = scraped["published_at"]
        bookmark.word_count = scraped["word_count"]
        bookmark.reading_time_min = scraped["reading_time_min"]
        bookmark.content_snippet = content[:500] if content else ""
        bookmark.domain = extract_domain(bookmark.url)
        bookmark.favicon_url = f"https://{bookmark.domain}/favicon.ico"
        bookmark.scraped_at = __import__("datetime").datetime.utcnow()
        bookmark.status = "scraped"
        db.commit()

        # Step 2: AI 分析
        bookmark.status = "summarizing"
        db.commit()

        result, usage = analyze(bookmark.url, content, bookmark.title or "")

        bookmark.title = result.title or bookmark.title
        bookmark.summary = result.summary
        bookmark.full_summary = result.full_summary
        bookmark.reading_time_min = result.reading_time_min

        # 分类
        category = db.query(Category).filter(Category.slug == result.category).first()
        if category:
            bookmark.categories.append(category)

        # 标签
        for tag_name in result.tags:
            slug = tag_name.lower().replace(" ", "-")
            tag = db.query(Tag).filter(Tag.slug == slug).first()
            if not tag:
                tag = Tag(name=tag_name, slug=slug)
                db.add(tag)
                db.flush()
            if tag not in bookmark.tags:
                bookmark.tags.append(tag)

        # 记录AI用量
        log = AIUsageLog(
            bookmark_id=bookmark.id,
            operation="analyze",
            model=usage["model"],
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
            total_tokens=usage["total_tokens"],
            estimated_cost=usage["estimated_cost"],
        )
        db.add(log)

        bookmark.status = "ready"
        bookmark.error_message = None
        db.commit()

    except Exception as e:
        bookmark.status = "failed"
        bookmark.error_message = str(e)
        db.commit()


def create_bookmark_manual(db: Session, url: str, title: str, summary: str, collection_id: int | None) -> Bookmark:
    """手动模式：不抓取不AI，直接用用户提供的信息"""
    norm = normalize_url(url)
    url_hash = hash_url(norm)
    domain = extract_domain(url)

    bookmark = Bookmark(
        url=url,
        url_hash=url_hash,
        title=title,
        summary=summary,
        domain=domain,
        favicon_url=f"https://{domain}/favicon.ico",
        collection_id=collection_id,
        use_ai=False,
        status="ready",
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark
