import re

import httpx
from bs4 import BeautifulSoup


def scrape(url: str) -> dict:
    """抓取网页，返回提取的内容"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }

    resp = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    # 提取标题
    title = None
    if soup.title:
        title = soup.title.get_text(strip=True)
    if not title:
        og_title = soup.find("meta", property="og:title")
        if og_title:
            title = og_title.get("content", "").strip()

    # 提取作者
    author = None
    for name in ["author", "article:author"]:
        meta = soup.find("meta", property=name) or soup.find("meta", attrs={"name": name})
        if meta and meta.get("content"):
            author = meta["content"].strip()
            break

    # 提取发布时间
    published_at = None
    for name in ["article:published_time", "date"]:
        meta = soup.find("meta", property=name) or soup.find("meta", attrs={"name": name})
        if meta and meta.get("content"):
            published_at = meta["content"].strip()
            break

    # 提取正文
    content = _extract_content(soup)

    # 元描述
    meta_desc = soup.find("meta", attrs={"name": "description"})
    description = meta_desc["content"].strip() if meta_desc and meta_desc.get("content") else ""

    word_count = len(content)

    return {
        "title": title,
        "author": author,
        "published_at": published_at,
        "description": description,
        "content": content,
        "word_count": word_count,
        "reading_time_min": max(1, word_count // 400),
    }


def _extract_content(soup: BeautifulSoup) -> str:
    """提取页面正文文本"""
    # 移除不需要的元素
    for tag in soup(["script", "style", "nav", "header", "footer", "aside",
                      "noscript", "iframe", "form", "button"]):
        tag.decompose()

    # 按优先级找正文容器
    selectors = ["article", "main", '[role="main"]', ".post-content", ".article-content",
                 ".entry-content", "#content", ".content", ".post", ".article"]
    container = None
    for sel in selectors:
        container = soup.select_one(sel)
        if container:
            break

    if container is None:
        container = soup.body or soup

    text = container.get_text(separator="\n", strip=True)
    # 合并多余空行
    text = re.sub(r"\n{3,}", "\n\n", text)
    # 截断过短的行
    lines = [line.strip() for line in text.split("\n") if len(line.strip()) > 20]
    return "\n".join(lines)
