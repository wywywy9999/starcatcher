import json
from dataclasses import dataclass

from openai import OpenAI

from app.config import settings


SYSTEM_PROMPT = """你是一个书签策展助手。分析网页内容，输出结构化JSON。

规则：
- title: 清理后的标题，去掉网站名和点击诱饵后缀，不超过100字
- summary: 2-3句摘要，语言跟随原文
- full_summary: 5-8句详细摘要，覆盖要点和结论
- category: 从以下列表选最合适的: tech, science, business, design, reading, video, tool, life, other
- tags: 3-6个具体标签，英文kebab-case。不要用"article""web"这种泛词
- language: 原文语言 zh / en / mixed
- reading_time_min: 估算阅读时间(分钟)，整数
- is_article: 是否是文章(视频页/工具页/搜索页=false)

只输出JSON，不要markdown包裹，不要解释。"""


@dataclass
class AIResult:
    title: str
    summary: str
    full_summary: str
    category: str
    tags: list[str]
    language: str
    reading_time_min: int
    is_article: bool


def analyze(url: str, content: str, title_hint: str) -> tuple[AIResult, dict]:
    """调用 DeepSeek 分析网页内容"""
    client = OpenAI(api_key=settings.deepseek_api_key, base_url=settings.deepseek_base_url)

    # 截断内容控制 token 消耗
    truncated = content[:5000] if content else ""

    user_prompt = f"""URL: {url}
页面标题: {title_hint or '无'}

=== 页面正文（前5000字符）===
{truncated}
=== 结束 ===

分析以上内容，输出JSON。"""

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=1000,
        response_format={"type": "json_object"},
    )

    usage = response.usage
    text = response.choices[0].message.content

    data = json.loads(text)

    return AIResult(
        title=data.get("title", title_hint or ""),
        summary=data.get("summary", ""),
        full_summary=data.get("full_summary", ""),
        category=data.get("category", "other"),
        tags=data.get("tags", []),
        language=data.get("language", "zh"),
        reading_time_min=data.get("reading_time_min", 1),
        is_article=data.get("is_article", True),
    ), {
        "model": "deepseek-chat",
        "prompt_tokens": usage.prompt_tokens if usage else 0,
        "completion_tokens": usage.completion_tokens if usage else 0,
        "total_tokens": usage.total_tokens if usage else 0,
        "estimated_cost": _estimate_cost(usage.prompt_tokens, usage.completion_tokens) if usage else 0,
    }


def get_recommendations(tag_ids: list[int], exclude_id: int, limit: int = 5) -> list[int]:
    """基于标签重叠数推荐相似书签，返回书签ID列表。
    这个函数由 router 调用时传入具体的 DB session 执行查询。
    这里只提供逻辑签名。"""
    return tag_ids, exclude_id, limit


def _estimate_cost(prompt_tokens: int, completion_tokens: int) -> float:
    """DeepSeek-chat 价格估算（人民币）"""
    cost = (prompt_tokens / 1_000_000) * 0.14 + (completion_tokens / 1_000_000) * 0.28
    return round(cost, 6)
