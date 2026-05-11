# Hetero 个人网站规划

## 当前已有基础

- Astro 6 + SSR (Node adapter, standalone)
- React 19 Islands
- Tailwind CSS v4 + MDX + Expressive Code
- Content Collections (posts)
- 自定义字体 (Noto Sans SC + Cascadia Code)
- 基础布局 (Header/Footer/Layout)
- 站点地图 (@astrojs/sitemap)

---

## 一、内容架构扩展

充分利用 Content Layer API，设计多 Collection：

| Collection | 用途 | 来源 | Schema 要点 |
|---|---|---|---|
| `posts` | 博客文章 (已有) | `src/posts/*.mdx` | title, desc, tags, draft, createdAt, updatedAt |
| `projects` | 项目展示 | `src/projects/*.mdx` | title, desc, tech stack, link, cover |
| `notes` | 短笔记/TIL | `src/notes/*.mdx` | title, tags, createdAt |
| `friends` | 友链 | `src/data/friends.json` | name, url, avatar, desc |

每个 collection 拥有独立的 schema、标签系统和展示页面。

---

## 二、页面路由规划

```
/                        首页（个人介绍 + 最新动态）
/posts                   文章列表（分页、标签筛选）
/posts/[slug]            文章详情
/posts/tags/[tag]        按标签归档
/projects                项目展示
/notes                   短笔记/碎片
/about                   关于页面（时间线/经历）
/friends                 友链
/rss.xml                 RSS 订阅
/sitemap-index.xml       站点地图（已有）
```

---

## 三、Astro 特性最大化利用

### 1. View Transitions（页面过渡动画）

Astro 内置 `<ViewTransitions />` 组件，实现 SPA 级别的页面切换体验：

- 页面间平滑过渡
- 持久化 Header/Footer（`transition:persist`）
- 文章卡片到详情页的 morph 动画（`transition:name`）
- 自定义过渡动画（fade、slide）

```astro
---
// Layout.astro
import { ViewTransitions } from 'astro:transitions';
---
<head>
  <ViewTransitions />
</head>
```

### 2. Islands Architecture（交互岛屿）

React 仅用于需要交互的部分，其余全部静态渲染：

| 组件 | 指令 | 原因 |
|---|---|---|
| 搜索组件 | `client:idle` | 非首屏关键，空闲时加载 |
| 主题切换按钮 | `client:load` | 需要立即响应 |
| 目录高亮 TOC | `client:media="(min-width: 1024px)"` | 仅桌面端需要 |
| 评论区 | `client:visible` | 滚动到可见时加载 |

### 3. Server Islands（服务端岛屿）

在静态页面中嵌入动态内容，无需整页 SSR：

- 文章阅读量/点赞数
- 最近活动 feed
- GitHub contribution 数据

```astro
<ServerIsland component={ViewCounter} server:defer>
  <p slot="fallback">加载中...</p>
</ServerIsland>
```

### 4. Content Layer API

- glob loader 加载本地 MDX 文件
- 可扩展自定义 loader 拉取外部数据源：
  - GitHub repos（项目列表自动同步）
  - 豆瓣读书/电影（阅读记录）
  - RSS 聚合（关注的博客）

### 5. Middleware

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // 访问统计
  // 请求日志
  // 安全头设置 (CSP, X-Frame-Options, X-Content-Type-Options)
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
});
```

### 6. API Endpoints（服务端路由）

利用 SSR 模式提供动态 API：

```
src/pages/api/search.ts    — 全文搜索接口
src/pages/api/views.ts     — 阅读量统计（读取/写入）
src/pages/api/likes.ts     — 点赞接口
```

### 7. Image Optimization

使用 `astro:assets` 的 `<Image>` 组件：

- 自动 WebP/AVIF 格式转换
- 响应式 srcset 生成
- 懒加载 (loading="lazy")
- 自动宽高属性防止 CLS

```astro
---
import { Image } from 'astro:assets';
import cover from '../assets/cover.png';
---
<Image src={cover} alt="文章封面" widths={[400, 800, 1200]} />
```

### 8. RSS Feed

使用 `@astrojs/rss` 生成标准 RSS：

```typescript
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = await getCollection('posts');
  return rss({
    title: 'Hetero',
    description: 'isyuah 的个人博客',
    site: context.site,
    items: posts.map(post => ({ ... })),
  });
}
```

### 9. i18n（可选，未来扩展）

Astro 内置 i18n 路由支持：

```
/zh/posts/...
/en/posts/...
```

配置 `astro.config.mjs` 中的 `i18n` 字段即可启用。

---

## 四、功能模块设计

### 搜索

**方案 A：纯前端搜索（推荐起步）**
- 构建时生成搜索索引 JSON（标题 + 摘要 + 标签）
- React island 实现前端模糊搜索
- 零服务端开销，适合文章量 < 200 篇

**方案 B：服务端搜索（文章量大时）**
- API endpoint `/api/search`
- 可接入 MeiliSearch / SQLite FTS

### 暗色模式

- Tailwind CSS v4 `@custom-variant dark (&:where(.dark, .dark *))` 
- 三态切换：浅色 / 深色 / 跟随系统
- localStorage 持久化用户偏好
- `<head>` 内 inline script 避免 FOUC（闪烁）

```html
<script is:inline>
  const theme = localStorage.getItem('theme') || 
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');
</script>
```

### 评论系统

**推荐：Giscus**
- 基于 GitHub Discussions，无需自建后端
- React island + `client:visible` 懒加载
- 支持暗色模式同步

### 文章功能增强

| 功能 | 实现方式 |
|---|---|
| 阅读时间估算 | 构建时计算字数 / 300 |
| 上一篇/下一篇 | getCollection 排序后取相邻 |
| 相关文章推荐 | 基于标签交集排序 |
| 系列文章 | frontmatter 中定义 `series` 字段 |
| 文章目录 (TOC) | 从 headings 生成，滚动高亮 |
| 代码复制按钮 | Expressive Code 已内置 |

### SEO

- 动态 `<title>` 和 `<meta description>`
- Open Graph / Twitter Card meta tags
- 结构化数据 JSON-LD（Article、Person、BreadcrumbList）
- canonical URL
- robots.txt

---

## 五、目录结构规划

```
src/
├── assets/              静态资源（图片等，会被优化）
├── components/
│   ├── Header.astro     导航栏
│   ├── Footer.astro     页脚
│   ├── PostCard.astro   文章卡片
│   ├── TagList.astro    标签列表
│   ├── TOC.astro        目录组件
│   ├── Pagination.astro 分页组件
│   ├── SEO.astro        SEO meta 组件
│   └── react/           React 交互组件
│       ├── Search.tsx   搜索
│       ├── ThemeToggle.tsx 主题切换
│       └── Comments.tsx 评论
├── config/
│   └── site.config.ts   站点配置
├── content.config.ts    Collection 定义
├── data/
│   └── friends.json     友链数据
├── layouts/
│   ├── Layout.astro     基础布局
│   ├── PostLayout.astro 文章布局
│   └── ListLayout.astro 列表布局
├── middleware.ts        中间件
├── pages/
│   ├── index.astro      首页
│   ├── about.astro      关于
│   ├── friends.astro    友链
│   ├── posts/
│   │   ├── index.astro  文章列表
│   │   ├── [...filename].astro 文章详情
│   │   └── tags/
│   │       └── [tag].astro 标签归档
│   ├── projects.astro   项目展示
│   ├── notes/
│   │   └── index.astro  笔记列表
│   ├── rss.xml.ts       RSS
│   └── api/
│       ├── search.ts    搜索 API
│       └── views.ts     阅读量 API
├── posts/               博客文章 (MDX)
├── projects/            项目内容 (MDX)
├── notes/               短笔记 (MDX)
├── styles/
│   ├── global.css       全局样式 + Tailwind
│   ├── theme.css        主题变量 / 暗色模式
│   ├── animations.css   动画定义
│   └── markdown.css     文章排版
└── utils/
    ├── post.ts          文章工具函数
    ├── date.ts          日期格式化
    └── search.ts        搜索索引生成
```

---

## 六、样式与设计系统

### 设计原则

- 以 Tailwind utility 为主，复杂组件用 CSS 变量
- 响应式断点：mobile-first
- 动画克制，仅用于页面过渡和微交互
- 排版优先，内容为王

### 色彩方案

```css
/* theme.css */
:root {
  --color-primary: /* 主色调 */;
  --color-bg: /* 背景色 */;
  --color-text: /* 正文色 */;
  --color-text-secondary: /* 次要文字 */;
  --color-border: /* 边框色 */;
  --color-accent: /* 强调色 */;
}

.dark {
  --color-primary: /* 暗色主色调 */;
  --color-bg: /* 暗色背景 */;
  /* ... */
}
```

### 字体策略（已配置）

- 正文：Noto Sans SC（中文优化）
- 代码：Cascadia Code（连字支持）

---

## 七、部署与性能策略

### 渲染策略（Hybrid）

- 大部分页面 `prerender: true`（静态生成）
- 动态 API 路由走 SSR
- Server Islands 按需渲染动态片段

### 性能优化清单

- [x] 字体 preload（已配置）
- [ ] `font-display: swap` 避免 FOIT
- [ ] 图片使用 `<Image>` 组件自动优化
- [ ] 关键 CSS 内联（Astro 自动处理）
- [ ] JS 按需加载（Islands 架构天然支持）
- [ ] 静态资源 CDN（R2 已有）
- [ ] 页面预加载（View Transitions 的 prefetch）

### 部署目标

- Node.js standalone（当前配置）
- 可选：切换为 Cloudflare Pages adapter（边缘部署）

---

## 八、实施路线图

### Phase 1：基础完善（优先级最高）

1. View Transitions 集成
2. 暗色模式实现
3. SEO 组件（meta、OG、JSON-LD）
4. 布局系统完善（PostLayout、ListLayout）

### Phase 2：文章系统增强

5. 文章列表分页
6. 标签系统 + 标签归档页
7. 阅读时间估算
8. TOC 滚动高亮优化
9. 上一篇/下一篇导航
10. 相关文章推荐

### Phase 3：搜索与交互

11. 搜索索引生成
12. 搜索 React island
13. 评论系统 (Giscus)
14. RSS Feed

### Phase 4：内容扩展

15. Projects collection + 展示页
16. Notes collection + 列表页
17. About 页面（时间线）
18. Friends 友链页

### Phase 5：动态功能

19. Middleware（安全头、日志）
20. 阅读量统计 API
21. Server Islands 动态内容

### Phase 6：性能与体验

22. 图片优化全面接入
23. Prefetch 策略调优
24. Lighthouse 审计 & 修复
25. 可访问性 (a11y) 审查

---

## 九、技术决策记录

| 决策 | 选择 | 原因 |
|---|---|---|
| 渲染模式 | Hybrid (SSR + prerender) | 兼顾静态性能和动态需求 |
| CSS 方案 | Tailwind CSS v4 | 原子化、v4 性能提升、生态成熟 |
| UI 框架 | React (Islands) | 仅交互组件使用，不影响静态性能 |
| 内容格式 | MDX | 支持组件嵌入，表达力强 |
| 代码高亮 | Expressive Code | 功能丰富（行号、折叠、复制） |
| 评论 | Giscus | 无后端依赖，GitHub 生态 |
| 搜索 | 前端模糊搜索 | 起步简单，文章量小时足够 |
| 部署 | Node standalone | 灵活，可迁移到边缘 |
