# StarCatcher（揽星）

智能书签 + 个人知识库。保存网页自动 AI 摘要分类，也能随手记录笔记、复盘、备忘。

## 三种记录方式

| 模式 | 用途 |
|------|------|
| **AI 自动** | 贴链接，自动抓取网页内容，DeepSeek 生成摘要 + 分类 + 标签 |
| **手动填写** | 贴链接，自己写标题和摘要 |
| **自己写** | 不贴链接，写标题 + 摘要 + 正文，当备忘录用 |

## 核心功能

- 书签卡片网格，按分类/标签/搜索筛选
- AI 自动摘要（需要 DeepSeek API Key，可选）
- 多分类 + 多标签，拖拽排序
- 批量添加、批量导出（Markdown / CSV）
- 正文批注：选中文字添加标注，右侧显示
- 置顶、编辑、笔记

## 技术栈

- 前端：Next.js + Tailwind CSS + React Query
- 后端：Python FastAPI + SQLAlchemy + SQLite
- AI：DeepSeek API（可选，不配置也能用大部分功能）

## 启动

```bash
# 后端
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 前端
cd frontend
npm install
npx next dev --port 3000
```

或双击 `start.bat` 一键启动。

浏览器打开 `http://localhost:3000`

## 配置

复制 `backend/.env.example` 为 `backend/.env`，填入 DeepSeek API Key（可选）。

```env
DEEPSEEK_API_KEY=your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DATABASE_URL=sqlite:///./data/linkvault.db
```

## 个人使用场景

除保存网页外，我主要用来记录面试准备内容：

- 面试复盘笔记
- 行为问题回答思路
- 自我介绍草稿
- 产品分析框架

不用 API 的话，用「自己写」模式就是纯粹的备忘录工具。
