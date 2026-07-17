# WordPress 内容站迁移至 Nuxt 4：开发交接

> 项目目录：`restored-nuxt`  
> 交接日期：2026-07-17  
> 当前状态：迁移完成，静态构建与内容路由验证通过  
> 后续文章写作与发布：参见 [`ADDING_ARTICLES.md`](./ADDING_ARTICLES.md)

## 1. 交付结论

`pythonturtle.cc` 的已恢复文章已经接入 Nuxt 4 + Nuxt UI 站点。当前版本可从 Markdown 生成完整的文章、分类、标签、归档、分页、搜索、站点地图和 RSS，并输出可直接部署的静态文件。

本次最终验证结果：

| 项目 | 结果 |
| --- | ---: |
| 已发布文章 | 122 篇 |
| 分类 | 4 个 |
| 标签 | 5 个 |
| 内容与索引路由 | 203 条 |
| 内容路由重复 | 0 条 |
| 静态产物缺失路由 | 0 条 |
| TypeScript / Vue 类型检查 | 通过 |
| Nuxt 静态生成 | 通过 |

分类文章数：

| 分类 | 文章数 |
| --- | ---: |
| 海龟绘图 100 题 | 113 |
| 海龟绘图详解 | 4 |
| 常用方法索引 | 1 |
| 常用工具 | 4 |

122 篇文章的发布时间分布为 2019 年 72 篇、2020 年 50 篇。

---

## 2. 迁移范围

这次工作建立在前一阶段的 WordPress 恢复结果上，没有重新解析原始 WordPress 数据库。

完整链路如下：

```text
WordPress WXR + wp-content/uploads
        │
        ▼
restored-site/                    Hugo 恢复项目，仅保留为历史恢复来源
        │
        └── 已完成一次性内容迁入
        │
        ▼
restored-nuxt/
        ├── content/posts/        122 篇恢复文章与后续新文章
        ├── content/taxonomy_terms.json
        └── public/wp-content/uploads/
        │
        ▼
restored-nuxt/scripts/build-content.mjs
        │
        ├── 读取项目内文章与术语数据
        ├── 解析 TOML / YAML front matter
        ├── Markdown 转 HTML
        ├── 建立目录、摘要、分类、标签、归档和分页
        ├── 生成 Nuxt 使用的 JSON
        ├── 生成 sitemap.xml
        └── 生成 rss.xml
        │
        ▼
Nuxt 4 + Nuxt UI
        │
        ▼
.output/public/                   最终静态站点
```

### 本次已完成

- 将活动前端迁入 Nuxt 4 的 `app/` 目录结构。
- 使用 Nuxt UI 重建全站页头、导航、首页、文章列表、文章页、目录、分页、搜索、页脚和错误页。
- 接入 122 篇恢复文章，并保留原文章 URL。
- 接入 4 个分类、5 个标签和年度归档。
- 为首页、文章列表、分类、标签、归档建立每页 12 篇的静态分页。
- 为文章标题生成稳定锚点和右侧目录。
- 为代码块增加统一工具栏和复制按钮。
- 为文章与索引页补齐 canonical、Open Graph、Twitter Card 和 JSON-LD。
- 生成 RSS、站点地图及 Nuxt 预渲染路由。
- 将 122 篇恢复文章和术语数据迁入项目内，解除对相邻 Hugo 项目的构建依赖。
- 建立文章模板和开发时自动重建流程。
- 保留旧文章图片路径 `/wp-content/uploads/...`。

### 本次没有处理

- 没有删除 Hugo 恢复项目；它仅作为历史恢复备份，不再参与 Nuxt 构建。
- 没有把 122 篇旧文章批量改成新的 YAML front matter。
- 没有为站内搜索接入服务端索引或第三方搜索服务。
- 没有为来源不明的旧 HTML 做运行时消毒；当前内容必须继续被视为可信静态内容。
- 没有处理用户、评论、WordPress 后台、动态投稿或数据库功能。

---

## 3. 目录职责

从工作区根目录看，几个主要目录的职责如下：

| 路径 | 职责 |
| --- | --- |
| `pythonturtle.cc/` | 原 WordPress 文件和 uploads 来源，不是当前构建入口。 |
| `restored-site/` | WordPress WXR 恢复后的 Hugo 历史项目；当前 Nuxt 构建不再依赖它。 |
| `restored-large-assets/` | 超过原静态托管单文件限制的大文件备份。 |
| `restored-nuxt/` | 当前活动站点和最终交付项目。 |

`restored-nuxt/` 内部：

| 路径 | 职责 |
| --- | --- |
| `app/` | Nuxt 4 活动应用源码。 |
| `app/pages/` | 首页、首页分页及通用内容路由。 |
| `app/components/` | 页头、搜索、文章卡片、目录、侧栏等活动组件。 |
| `app/assets/css/main.css` | 当前全站样式。 |
| `content/posts/` | 全部文章源文件，包括 122 篇恢复文章与后续新文章。 |
| `scripts/build-content.mjs` | 内容构建核心。 |
| `content/taxonomy_terms.json` | 分类与标签定义。 |
| `site.config.mjs` | 站点域名、标题、描述与顶部菜单的单一配置源。 |
| `scripts/dev.mjs` | 开发服务器与文章监听器。 |
| `scripts/verify-build.mjs` | 部署产物、路由和站内资源校验。 |
| `content-data/` | 构建生成的站点数据，不应手工编辑。 |
| `public/wp-content/uploads/` | 旧文章图片和静态附件。 |
| `public/sitemap.xml` | 构建生成的站点地图。 |
| `public/rss.xml` | 构建生成的 RSS。 |
| `.output/public/` | `npm run generate` 的可部署静态产物。 |
| `dist` | Nuxt 生成的兼容性符号链接；部署时仍应直接使用 `.output/public/`。 |

### Nuxt 4 活动源码

Nuxt 4 当前只使用 `app/` 作为源码目录：

```text
app/app.vue
app/app.config.ts
app/assets/css/main.css
app/components/
app/layouts/
app/pages/
```

迁移过程中位于项目根目录的旧 `app.vue`、`components/`、`pages/` 和旧样式副本已于 2026-07-17 清理，并在清理后重新通过类型检查与静态生成。

---

## 4. 技术栈与构建入口

主要依赖定义在 `package.json`：

- Nuxt `4.4.8`
- Nuxt UI `4.10.0`
- Vue `3.5.x`
- Vue Router `5.x`
- Tailwind CSS `4.x`
- Marked `18.x`
- YAML `2.x`
- TypeScript `6.x`

常用命令：

```bash
npm ci
npm run dev
npm run build:data
npm run typecheck
npm run generate
npm run preview
```

| 命令 | 行为 |
| --- | --- |
| `npm run dev` | 先生成内容数据，再启动 Nuxt；同时监听本地 `content/posts/`。 |
| `npm run build:data` | 只重建 JSON、路由、站点地图和 RSS。 |
| `npm run typecheck` | 运行 Nuxt/Vue/TypeScript 类型检查。 |
| `npm run generate` | 先重建内容数据，再执行 Nuxt 静态生成。 |
| `npm run build` | 当前与 `npm run generate` 等价。 |
| `npm run preview` | 预览生产构建。 |

`nuxt.config.ts` 会在启动时读取 `content-data/routes.json`，把其中的全部地址交给 Nitro 预渲染。若内容发生变化但没有先运行内容构建，新路由不会进入本轮静态生成。

---

## 5. 内容构建机制

### 5.1 数据源

`scripts/build-content.mjs` 只读取项目内的 `content/posts/`。脚本读取该目录第一层的 `.md` 文件，并忽略文件名以 `_` 开头的文件。

恢复文章使用 TOML front matter：

```toml
+++
title = "..."
url = "/turtle100-1/"
+++
```

新文章推荐使用 YAML front matter：

```yaml
---
title: "..."
slug: "new-article"
draft: false
---
```

两种格式由同一个脚本解析。新文章的完整字段说明见 `ADDING_ARTICLES.md`。

### 5.2 URL 唯一性

文章以最终 URL 为唯一键。`content/posts/` 中出现重复 URL 时，内容构建会立即失败并列出冲突文件，避免静默覆盖已发布文章。修订旧文章时应直接编辑对应源文件，并保持原 URL 不变。

### 5.3 构建产物

内容构建会写入：

```text
content-data/site.json
content-data/routes.json
public/sitemap.xml
public/rss.xml
```

`site.json` 是前端的主要数据源，包含：

- 站点标题、副标题和菜单。
- 按时间倒序排列的文章。
- 分类及其文章列表。
- 标签及其文章列表。
- 年度归档。
- 全部静态内容路由。

`routes.json` 只保存预渲染路径数组，供 `nuxt.config.ts` 使用。

不要直接修改这些生成文件。下一次 `build:data` 会覆盖手工改动。

### 5.4 Markdown 增强

构建脚本在 Marked 输出之后还会执行一层 HTML 增强：

- 为每个代码块包裹工具栏。
- 为代码块增加“复制”按钮钩子。
- 为 `##` 和 `###` 生成稳定 `id`。
- 处理同名标题的锚点冲突。
- 生成文章右侧目录数据。
- 为旧 WordPress 图片说明补充站点样式类。
- 从正文第一张图片推断缩略图。
- 未填写 description 时，从正文提取最多 120 个字符作为摘要。

当前代码工具栏统一标为 `Python`，没有根据 fenced code language 自动切换标签。

### 5.5 分类与标签

分类和标签定义来自：

```text
content/taxonomy_terms.json
```

构建时会重新计算每个术语的文章数，JSON 中原有的 `count` 不是最终展示值。

文章中写入未登记的分类或标签会让内容构建失败。新增术语时必须先更新 `content/taxonomy_terms.json`，再重新生成数据和静态站点。

顶部菜单和分类排序目前在 `scripts/build-content.mjs` 中显式定义。新增一级分类时，还应检查这两处是否需要调整。

---

## 6. 路由与分页

### 6.1 固定索引

当前固定索引包括：

```text
/
/posts/
/category/
/tag/
/archives/
```

### 6.2 内容路由

其余路由由内容构建生成：

- 122 条文章路由。
- 4 条分类路由。
- 5 条标签路由。
- 首页、全部文章、归档、分类和标签的分页路由。

分页大小统一为 12 篇。第一页使用基础路径，第二页起使用：

```text
/page/2/
/posts/page/2/
/archives/page/2/
/category/turtle100/page/2/
/tag/turtle100/page/2/
```

首页分页由 `app/pages/page/[page].vue` 处理；其他文章、分类、标签和归档路径由 `app/pages/[...slug].vue` 统一识别。

### 6.3 404 行为

- 无效的首页分页会直接抛出 Nuxt 404。
- 通用内容路由找不到文章或索引时，会显示“页面未找到”卡片。
- 全局 `app/error.vue` 会输出 noindex 的错误页。

如果希望所有未知通用路由都返回真实 HTTP 404，而不是渲染站内空状态，后续可把 `[...slug].vue` 的最后分支改为 `createError()`。修改后要复核静态托管平台的 404 行为。

---

## 7. 前端结构

### 7.1 全局壳层

`app/app.vue` 负责：

- `UApp` 中文区域设置。
- 全局页头与页脚。
- Nuxt 页面和布局出口。
- 全局站点 SEO 默认值。
- favicon、RSS alternate 链接和 WebSite JSON-LD。

`app/layouts/docs.vue` 为内容页提供左侧导航、正文和右侧目录的三栏结构。

### 7.2 首页与列表

- `HomeLanding.vue` 输出首页 Hero、最新文章和分页。
- `ArticleList.vue` 负责列表容器。
- `ArticleCard.vue` 输出缩略图、分类、日期、标题和摘要。
- 没有缩略图时，文章卡片按首个分类显示占位图标。
- `ArticlePagination.vue` 统一生成第一页与后续分页链接。

### 7.3 文章页

`app/pages/[...slug].vue` 同时承担文章和目录型页面的解析。文章页包含：

- 分类、标题、摘要和发布日期。
- 正文 HTML。
- 文章标签。
- 上一篇和下一篇。
- 桌面端右侧目录与移动端折叠目录。
- canonical、文章 Open Graph、Twitter Card 和 BlogPosting JSON-LD。

`PostContent.vue` 使用 `v-html` 输出构建后的正文，并在客户端处理代码复制按钮。

### 7.4 搜索

`AppSearch.vue` 是纯客户端搜索：

- 数据来自构建时生成的 `site.json`。
- 搜索范围为标题、摘要、分类和标签。
- 标题匹配权重最高。
- 最多显示前 12 条结果。
- 支持 `Ctrl+K` 或 `Command+K` 打开，`Escape` 关闭。

优点是无外部服务、静态部署即可使用；缺点是全部文章摘要数据会进入前端包，文章量大幅增加后需要评估独立搜索索引或服务端方案。

### 7.5 样式

活动样式文件是：

```text
app/assets/css/main.css
```

该文件同时覆盖 Nuxt UI 外观和旧 WordPress 正文样式。修改正文样式时应至少检查：

- 标题锚点和目录定位。
- 图片与 WordPress caption。
- 代码块和复制工具栏。
- 表格横向滚动。
- 桌面三栏与移动端布局。
- 长 URL、中文标点和行内代码换行。

---

## 8. SEO 与输出文件

当前实现包含：

- 全站中文语言声明。
- 页面级 title 和 description。
- canonical URL。
- Open Graph 和 Twitter Card。
- 文章发布时间、修改时间、分类和标签元数据。
- WebSite、CollectionPage、BreadcrumbList、BlogPosting JSON-LD。
- `public/sitemap.xml`。
- `public/rss.xml`，收录最新 20 篇文章。
- `public/robots.txt`。
- 默认社交分享图 `public/og-default.png`。

站点域名、标题、描述和顶部菜单集中在 `site.config.mjs`。如果更换域名，只修改该配置并重新生成 sitemap、RSS 和静态页面。

---

## 9. 旧图片与大文件

旧文章继续使用：

```text
/wp-content/uploads/...
```

Nuxt 项目的 `public/wp-content/uploads/` 中现有 606 个恢复文件。文章正文中已识别到 118 个不同的站内 uploads 引用。

前一阶段恢复报告还记录了 5 个超过 25 MiB 的安装包，位于：

```text
../restored-large-assets/
```

这些文件包括旧版 Scratch、Dev-C++ 和 Python 安装包。它们没有作为普通 Pages 静态文件纳入当前 Nuxt 输出。若需要继续提供下载，应上传到对象存储，再把文章链接改为稳定的公开地址。

另外，部分旧工具文章仍包含外部 `judi.coding.net` 下载链接。此类链接可能失效，维护时应逐篇核验，并在文章中注明核验日期。

---

## 10. 开发与发布流程

### 首次安装

```bash
cd restored-nuxt
npm ci
```

### 本地开发

```bash
npm run dev
```

开发脚本会：

1. 先执行 `scripts/build-content.mjs`。
2. 启动 Nuxt 开发服务器。
3. 监听 `content/posts/` 下的 Markdown。
4. 本地文章保存后自动重建内容数据。

监听器会监控 `content/posts/`。修改 `content/taxonomy_terms.json` 后，需要手动运行：

```bash
npm run build:data
```

或重启开发服务器。

### 发布前验证

```bash
npm run check
```

该命令依次执行内容构建、类型检查、静态生成和部署产物校验。

建议再检查：

```bash
npm run preview
```

最终部署目录：

```text
.output/public/
```

静态托管平台应把该目录作为发布产物。项目已经自包含，不需要访问相邻的 `restored-site/`。

---

## 11. 当前已知限制与后续建议

### 高优先级

1. **处理大文件下载。** 5 个旧安装包应迁入对象存储，或从文章中删除失效下载入口。
2. **核验旧工具文章。** 2019 年的软件版本和外链很可能已经过时，更新时必须修改正文并填写 `lastmod`。

### 中优先级

当前 `npm run generate` 会输出几类非阻断警告：模块预加载 polyfill 的 sourcemap 提示、VueUse 中 `/* #__PURE__ */` 注释位置提示，以及主客户端 chunk 超过 500 kB。构建仍会成功，但后续应结合包体分析处理代码拆分；当前把完整文章搜索数据放入前端是重点排查对象。

1. 为内容构建脚本增加单元测试，覆盖 front matter、草稿、目录锚点和分页。
2. 让代码块工具栏读取实际语言，而不是固定显示 `Python`。
3. 对新文章引入可信 Markdown HTML 策略；如果未来允许外部投稿，必须增加 HTML 消毒。

### 低优先级

1. 删除不再使用的迁移截图、Playwright 日志和临时文件。
2. 为文章图片建立压缩、尺寸和命名检查。
3. 文章量明显增长后，把搜索数据拆成独立索引，减少首屏包体。
4. 根据部署平台补充缓存头、404 重写和安全响应头。

---

## 12. 接手者快速检查清单

开始修改前：

- [ ] 确认自己位于 `restored-nuxt/`。
- [ ] 确认页面代码位于 `app/`，文章位于 `content/posts/`。
- [ ] 运行 `npm ci` 或确认依赖已安装。
- [ ] 运行 `npm run build:data`，核对文章、分类、标签和路由数量。

修改内容系统后：

- [ ] 检查旧文章 URL 未改变。
- [ ] 检查是否存在重复 URL，确认构建未报冲突。
- [ ] 检查分类、标签和分页路由。
- [ ] 检查 `content-data/routes.json`。
- [ ] 检查 `public/sitemap.xml` 与 `public/rss.xml`。
- [ ] 运行 `npm run typecheck`。
- [ ] 运行 `npm run generate`。
- [ ] 抽查桌面端、移动端、搜索、目录、代码复制和 404。

发布前：

- [ ] 确认 `.output/public/` 是本次构建的新产物。
- [ ] 确认全部 203 条内容路由在静态产物中存在。
- [ ] 运行 `npm run check` 并确认部署产物校验通过。
- [ ] 确认生产域名仍为 `https://pythonturtle.cc`。

---

## 13. 验证基线

2026-07-17 的验证基线如下：

```json
{
  "posts": 122,
  "categories": 4,
  "tags": 5,
  "routes": 203
}
```

后续如果只改 UI，这四个数字通常不应变化。如果新增、删除文章或调整分类标签，数字可以变化，但必须解释变化原因，并重新检查静态路由是否完整。
