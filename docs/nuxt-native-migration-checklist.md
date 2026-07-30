# Nuxt 原生内容迁移实施清单

本文档记录 Nuxt 原生内容迁移的执行顺序、验收标准和当前实施状态。

## 实施状态

- 已完成阶段 1-6：盘点、结构迁移、格式检查、项目文档清理、构建验证和抽样检查。
- 图片映射表已生成：`docs/nuxt-native-image-map.json`。
- 内容升级已进入阶段 7，目前只保留第 1-5 题升级结果。
- 一次性迁移脚本已执行，完成后从维护源码中移除；后续通过测试防止旧格式回流。

## 目标

把当前内容站从迁移态整理为 Nuxt 原生内容站：

- 保留现有文章 URL，例如 `/turtle100-1/`
- 移除 WordPress 相关字段、路径、HTML class 和文档说明
- 统一文章 front matter 为 YAML
- 统一文章正文为 Markdown
- 统一图片路径为 `/images/posts/...`
- 内容升级按样板审核后分批进行

## 不做

- 不批量改文章 URL
- 不保留 `/wp-content/uploads/...` 兼容路径
- 不在结构迁移时扩写题解内容
- 不在未确认模板前继续扩大到更多题目

## 阶段 1：迁移前盘点

- 统计所有文章数量、已发布文章数量和草稿数量
- 列出所有 `wordpress_*` 和 `wp_meta_*` front matter 字段
- 列出所有 `/wp-content/uploads/...` 图片引用
- 列出所有正文 HTML 标签类型，重点检查图片、链接、列表、代码块和表格
- 建立旧图片路径到新图片路径的映射表
- 抽样确认前 10 道海龟题图片命名规则，例如 `001.png` 到 `010.png`

验收标准：

- 有完整迁移映射表
- 能明确哪些文件会被修改、哪些资源会被移动
- 没有开始批量写入内容文件

## 阶段 2：结构迁移脚本

- 编写一次性迁移脚本，不手工逐篇修改
- 将 TOML front matter 转为 YAML front matter
- 删除 `wordpress_id`、`wordpress_guid`、`wordpress_status`、`wordpress_type`
- 删除 `wp_meta_*` 字段
- 保留当前 Nuxt 需要的字段：`title`、`date`、`lastmod`、`draft`、`url`、`slug`、`author`、`categories`、`tags`、`description`、`thumbnail`
- 将旧图片复制或移动到 Nuxt 图片目录
- 将文章中的图片引用更新为 `/images/posts/...`
- 将 HTML 正文转换为 Markdown 正文

验收标准：

- 脚本可重复运行或至少有明确的备份/回滚方式
- 迁移后文章不再出现 `wordpress`、`wp_`、`wp-content`、`wp-caption`、`wp-image`
- 迁移后图片路径和 `thumbnail` 路径一致指向 Nuxt 新目录

## 阶段 3：内容格式检查

- 检查所有文章是否使用 YAML front matter
- 检查所有文章正文是否为 Markdown
- 检查代码块是否为 fenced code block，并标注 `python`
- 检查图片是否有可读 alt 文本
- 检查标题层级是否从 `##` 开始，避免正文重复 `#`
- 检查所有文章是否有 `description`

验收标准：

- `content/posts` 下不再混用 TOML 和 HTML 源格式
- 每篇文章可被当前 `scripts/build-content.mjs` 正确解析
- 站内页面摘要来自显式 `description` 或合理 Markdown 摘要

## 阶段 4：项目文档清理

- 删除 `MIGRATION.md`
- 重写 `ADDING_ARTICLES.md` 为 Nuxt 原生写作指南
- 更新 `README.md`，移除“旧站迁移”“WordPress 恢复”等当前维护无关措辞
- 文档只保留当前维护方式：文章模板、图片路径、front matter、构建检查、发布流程

验收标准：

- 当前文档中不再把 WordPress 作为维护前提
- 新增文章的人只需要阅读 Nuxt 写作指南即可操作

## 阶段 5：构建验证

运行：

```bash
npm run check
```

如果需要更细验证，再运行：

```bash
npm run generate
```

检查：

- 内容数据生成成功
- 类型检查通过
- 静态生成通过
- sitemap、RSS、robots 生成正常
- 所有文章路由仍然存在
- 新图片路径在生成产物中可访问

验收标准：

- 构建无错误
- sitemap URL 数量不因迁移异常减少
- 现有文章 URL 保持不变
- 生成产物中不存在 `/wp-content/uploads`

本次结果：

- `npm run check` 已通过。
- 内容数据保持 122 篇发布文章、4 个分类、5 个标签和 202 条内容路由。
- 部署校验通过，`warnings` 为空。

## 阶段 6：人工抽样审核

至少检查这些页面：

- `/turtle100-1/`
- `/turtle100-2/`
- `/turtle100-10/`
- 一篇复杂海龟题
- 一篇“海龟绘图详解”文章
- 一篇“常用工具”文章
- 方法索引页 `/turtle-index/`

检查项：

- 页面可打开
- 标题、摘要、图片、代码块显示正常
- 图片路径为 `/images/posts/...`
- 正文没有 WordPress class
- 目录锚点正常
- 上一篇/下一篇正常
- canonical 保持当前文章 URL

验收标准：

- 抽样页面视觉和内容结构正常
- 没有明显 Markdown 转换错误
- 没有丢图、乱码、代码块错乱或链接损坏

本次结果：

- 已确认 `/turtle100-1/`、`/turtle100-2/`、`/turtle100-10/`、`/explain-draw-circle/`、`/dev-cpp-chinese-language/` 和 `/turtle-index/` 生成产物存在。
- 已确认 `/turtle100-1/` 生成页面引用 `/images/posts/turtle100/001.png`。

## 阶段 7：内容升级样板和分批扩展

结构迁移通过后，再开始内容升级。

先做第 1 题样板，确认后分批扩展后续题目。每篇包含：

- 题目
- 题目说明
- 最终效果
- 知识点
- 绘图思路
- 完整代码
- 关键步骤讲解
- 常见错误
- 练习

验收标准：

- 样板由站长审核通过
- 后续题目只按确认后的模板扩展
- 不在当前批次验收前继续扩大到更多题目

本次结果：

- 已完成 `content/posts/2019-05-05-turtle100-1.md` 第 1 题内容升级样板。
- 样板已包含题目、题目说明、最终效果、知识点、绘图思路、完整代码、关键步骤讲解、常见错误和练习。
- 已按确认后的模板扩展 `content/posts/2019-05-10-turtle100-2.md` 到 `content/posts/2019-05-24-turtle100-5.md`。
- 第 2-5 题已补齐题目说明、知识点、绘图思路、完整代码、关键步骤讲解、常见错误和练习。
- 第 6 题及以后已恢复为内容升级前的短题解版本，等待第 1-5 题验收后再继续。

## 非文章上线收尾

本次不继续扩写文章正文，仅完成结构、资源、文档和发布检查：

- 文档收尾：`README.md`、`ADDING_ARTICLES.md` 和 `DEPLOYMENT.md` 已按当前 Nuxt 维护方式保留；`MIGRATION.md` 已移除。
- 资源收尾：`public/images/posts/` 当前有 118 个图片文件；`public/wp-content` 已移除。
- 旧格式扫描：`content/posts`、`content-data`、`public`、`.output/public`、`README.md` 和 `ADDING_ARTICLES.md` 中未发现旧 WordPress 图片路径或旧 class；保留项只存在于测试和校验脚本中，用于防止回流。
- SEO 产物：`public/sitemap.xml`、`public/rss.xml` 和 `public/robots.txt` 已生成。
- 发布校验：`npm run check` 已通过，部署校验 `warnings` 为空。
- 文章审核范围：第 1-5 题升级结果保留；第 6 题及以后保持短题解，等第 1-5 题审核后再继续。

## 当前剩余事项

- 等待站长审核第 1-5 题内容升级样板。
- 审核通过后，再继续第 6 题及以后内容升级。

## 最终完成标准

- 源码中没有 WordPress 内容维护痕迹
- 文章 URL 保持稳定
- 图片目录和正文引用完全 Nuxt 化
- 文章源格式统一为 YAML + Markdown
- 项目文档只描述当前 Nuxt 维护方式
- 全站构建检查通过
- 第 1-5 题内容升级首批样板通过审核
