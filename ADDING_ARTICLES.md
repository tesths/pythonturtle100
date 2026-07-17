# 后续文章撰写与发布指南

> 适用项目：`restored-nuxt`  
> 最后更新：2026-07-17  
> 目标读者：后续文章作者、内容维护者和接手开发的工程师  
> 迁移背景与开发交接：参见 [`MIGRATION.md`](./MIGRATION.md)

## 1. 先看结论

新文章统一写在：

```text
restored-nuxt/content/posts/
```

推荐操作流程：

1. 复制 `content/posts/_template.md`。
2. 将副本改成有意义的英文文件名，例如 `draw-a-five-pointed-star.md`。
3. 修改文件顶部的 YAML front matter。
4. 使用 Markdown 编写正文。
5. 将文章图片放入 `public/images/posts/`。
6. 本地运行 `npm run dev` 检查文章、目录、代码块、图片和移动端布局。
7. 发布前运行 `npm run check`，统一执行内容构建、类型检查、静态生成和部署产物校验。

只要文章不是草稿，内容构建脚本就会自动把它加入文章列表、搜索数据、静态路由、站点地图和 RSS。

---

## 2. 项目如何处理一篇文章

文章并不是由页面组件直接读取。当前数据流如下：

```text
content/posts/*.md
        │
        ▼
scripts/build-content.mjs
        │
        ├── Markdown → HTML
        ├── 生成摘要和正文目录
        ├── 校验分类、标签和文章 URL
        ├── 生成 content-data/site.json
        ├── 生成 content-data/routes.json
        ├── 生成 public/sitemap.xml
        ├── 生成 public/rss.xml
        └── 生成 public/robots.txt
        │
        ▼
Nuxt 页面读取生成后的 JSON 并进行静态预渲染
```

开发模式下，`npm run dev` 会监听 `content/posts/` 中的 Markdown 文件。保存文章后，它会重新执行内容构建；Nuxt 随后刷新页面。

### 当前目录限制

- 文章必须直接放在 `content/posts/` 下。
- 当前构建脚本不会递归读取子目录。
- 文件扩展名必须是 `.md`。
- 文件名以 `_` 开头时不会参与构建；因此 `_template.md` 只是模板，不会成为正式文章。
- 新文章推荐使用 YAML front matter，也就是由 `---` 包围的格式。
- 从 WordPress 恢复的旧文章仍使用 TOML front matter，也就是由 `+++` 包围的格式；不要为了统一格式而批量改写旧文章。

---

## 3. 创建文章

在项目目录执行：

```bash
cd restored-nuxt
cp content/posts/_template.md content/posts/draw-a-five-pointed-star.md
```

文件名建议遵守以下规则：

- 使用小写英文、数字和连字符。
- 不使用空格、中文标点或特殊符号。
- 文件名尽量与 `slug` 一致，方便查找。
- 不要复用现有文章的 `slug` 或 `url`。

推荐示例：

```text
draw-a-five-pointed-star.md
python-turtle-circle-guide.md
turtle-screen-setup.md
```

不推荐：

```text
新文章.md
文章 1.md
final-final-v2.md
```

---

## 4. Front matter 完整说明

推荐格式：

```yaml
---
title: "用 Python Turtle 绘制五角星"
date: "2026-07-17T18:30:00+08:00"
lastmod: "2026-07-17T18:30:00+08:00"
slug: "draw-a-five-pointed-star"
categories:
  - "海龟绘图详解"
tags:
  - "少儿编程"
description: "从转角关系开始，逐步使用 Python Turtle 绘制一个五角星。"
thumbnail: "/images/posts/draw-a-five-pointed-star.png"
draft: false
---
```

### 字段表

| 字段 | 是否必需 | 说明 |
| --- | --- | --- |
| `title` | 强烈建议 | 页面标题、列表标题、搜索标题和 SEO 标题。 |
| `date` | 强烈建议 | 发布时间。推荐使用带时区的 ISO 8601 格式。 |
| `lastmod` | 可选 | 最后修改时间；实质性更新文章时填写。未填写时会使用 `date`。 |
| `slug` | 强烈建议 | 默认文章路径。`draw-a-flower` 会生成 `/draw-a-flower/`。 |
| `url` | 可选 | 显式指定旧路径或特殊路径；存在时优先于 `slug`。 |
| `categories` | 建议 | YAML 数组。当前应使用已经登记的分类名称。 |
| `tags` | 可选 | YAML 数组。用于文章展示、搜索和标签归档。 |
| `description` | 强烈建议 | 文章摘要、搜索描述、列表摘要和 SEO description。 |
| `thumbnail` | 可选 | 列表缩略图及社交分享图的候选地址。 |
| `draft` | 必需 | `true` 不参与构建，`false` 正常发布。 |

旧文章中还可能出现 `wordpress_id`、`wordpress_guid`、`wordpress_status` 等迁移字段。新文章不需要添加这些字段。

### URL 的优先级

构建脚本按以下顺序决定文章地址：

1. `url`
2. `slug`
3. Markdown 文件名

例如：

```yaml
slug: "draw-a-flower"
```

生成：

```text
/draw-a-flower/
```

如果同时填写：

```yaml
url: "/tutorial/draw-a-flower/"
slug: "draw-a-flower"
```

最终使用：

```text
/tutorial/draw-a-flower/
```

除非需要保留旧站 URL，否则新文章只填写 `slug` 即可。

### URL 冲突规则

所有文章都位于 `content/posts/`。两个文件使用同一个最终 URL 时，内容构建会失败并列出冲突文件，不会再静默覆盖文章。

修订已发布文章前，请先确认：

- 这是有意替换，而不是误用了相同 `slug`。
- 原 URL 必须继续保留，避免破坏搜索引擎收录和外部链接。
- 修改后的文章仍包含需要保留的正文、图片和元数据。

---

## 5. 分类和标签

### 当前分类

| 分类名称 | 页面地址 | 适用内容 |
| --- | --- | --- |
| `海龟绘图 100 题` | `/category/turtle100/` | 编号题目、题目解析和参考答案。 |
| `海龟绘图详解` | `/category/turtle-detailed/` | 某个 Turtle 概念、方法或绘图原理的完整讲解。 |
| `常用方法索引` | `/category/widely-used-functions/` | API、函数和参数速查。 |
| `常用工具` | `/category/common-tools/` | Python、IDE、Scratch 和开发工具相关内容。 |

分类名称必须完全匹配，包括空格和大小写。例如 `海龟绘图 100 题` 中间有空格。

### 当前标签

- `少儿编程`
- `turtle graphics 100 exercises`
- `海龟绘图 100 题`
- `工具`
- `软件`

### 新分类或新标签不会自动登记

当前文章构建会读取：

```text
content/taxonomy_terms.json
```

文章中写入未登记的分类或标签时，内容构建会失败，避免发布缺少索引页的内容。

如确实要增加术语，需要同时：

1. 修改 `content/taxonomy_terms.json`。
2. 为术语填写唯一的 `name`、`slug` 和 `url`。
3. 重新运行 `npm run build:data`。
4. 检查分类页或标签页是否进入 `content-data/routes.json`。
5. 运行 `npm run generate`，确认静态页面生成成功。
6. 如果新增的是一级重点分类，还要评估是否修改 `scripts/build-content.mjs` 中的顶部菜单和分类排序。

在没有明确内容规划前，优先复用现有分类和标签，不要为单篇文章建立新分类。

---

## 6. 正文结构建议

一篇教程应让读者依次知道“要画什么、为什么这样画、代码如何运行、哪里容易出错”。推荐结构如下。

```md
开头用一到两段说明本文目标、适合读者和最终效果。

## 最终效果

展示成品图，并用一句话说明图形由哪些基本元素组成。

## 绘图思路

拆解线段、圆弧、角度、循环次数和坐标关系。

## 完整代码

给出可以直接运行的完整 Python 程序。

## 代码讲解

### 初始化画布

解释窗口、画笔速度、颜色和坐标设置。

### 绘制主体

按代码执行顺序解释关键语句。

## 常见问题

列出方向错误、角度错误、窗口立即关闭等问题。

## 练习

给出一到两个可继续修改的参数或扩展任务。
```

### 不同栏目可采用不同模板

#### 海龟绘图 100 题

建议保持统一顺序：

1. 题目
2. 最终图形
3. 解析
4. 完整答案
5. 关键方法
6. 可选扩展

#### 海龟绘图详解

建议围绕一个明确问题展开：

1. 方法解决什么问题
2. 参数含义
3. 最小示例
4. 图形原理
5. 完整案例
6. 易错点
7. 相关方法

#### 常用方法索引

重点是快速检索：

1. 函数签名
2. 参数表
3. 返回值或运行效果
4. 最小示例
5. 常见组合用法
6. 相关方法链接

#### 常用工具

安装和配置类文章应写清：

1. 适用系统和版本
2. 下载来源
3. 安装步骤
4. 首次运行设置
5. 验证方法
6. 常见报错

工具下载地址和版本容易过期。更新此类文章时，应同步更新 `lastmod`，并在正文中写明核验日期。

---

## 7. Markdown 写法

### 标题

文章标题已经由 `title` 输出，正文不要再写一级标题 `#`。

```md
## 一级章节

### 二级章节
```

当前右侧“本页目录”只收集 `##` 和 `###`。章节标题应清楚表达内容，避免连续使用“说明”“其他”“补充”这类无法独立理解的标题。

### 段落和强调

```md
普通段落。

**重要内容**可以加粗，函数名使用 `turtle.circle()` 这样的行内代码。
```

不要用大段加粗代替结构，也不要连续堆叠过多提示框。

### Python 代码块

````md
```python
import turtle as t

for _ in range(5):
    t.forward(120)
    t.right(144)

t.done()
```
````

代码规范：

- 完整示例必须可以直接运行。
- 统一使用 4 个空格缩进。
- 不省略必要的 `import`。
- 教程中的变量名应能表达含义。
- 说明性注释写“为什么”，不要逐行复述代码。
- 文章发布前至少实际运行一次代码。

页面会自动为代码块增加“复制”按钮。当前代码工具栏统一显示 `Python`，因此不要在同一篇文章里混入大量其他语言代码。

### 图片

先将文件放在：

```text
public/images/posts/
```

正文写法：

```md
![五角星绘制完成后的效果](/images/posts/draw-a-five-pointed-star.png)
```

图片规范：

- 文件名使用小写英文和连字符。
- 不要使用“截图 1.png”这类名称。
- `alt` 文本说明图片展示的内容，不要只写“图片”。
- 优先使用经过压缩的 PNG、WebP 或 JPEG。
- 截图应裁掉无关桌面区域和个人信息。
- 图片路径必须以 `/` 开头。
- 不要把本机绝对路径写进文章，例如 `/Users/name/Desktop/a.png`。

如果没有填写 `thumbnail`：

1. 系统会尝试使用正文中的第一张图片。
2. 正文也没有图片时，文章卡片使用分类占位图。

因此，没有准备封面图时应删除或注释 `thumbnail`，不要保留一个不存在的示例路径。

### 链接

```md
[Python 官方网站](https://www.python.org/)
[站内相关文章](/turtle100-1/)
```

外部链接尽量指向官方来源。站内链接优先使用以 `/` 开头的绝对路径，避免文章路径变化后相对链接失效。

### 表格

```md
| 参数 | 含义 | 示例 |
| --- | --- | --- |
| `radius` | 圆的半径 | `100` |
| `extent` | 绘制角度 | `180` |
```

移动端表格空间有限。列数尽量控制在 3 至 4 列，长解释放回正文。

### 提示和警告

当前没有专用提示框语法，使用引用即可：

```md
> 注意：角度为正数时，Turtle 默认逆时针绘制圆弧。
```

### 原始 HTML

旧文章中保留了 WordPress 导出的 HTML，渲染器也允许 Markdown 中包含 HTML。但新文章优先使用标准 Markdown。

文章最终通过 `v-html` 渲染，只能提交可信内容。不要粘贴来源不明的 HTML、脚本、内联事件或第三方嵌入代码。

---

## 8. 标题、摘要和 SEO 写法

### 标题

标题应包含读者真正会搜索的对象和动作。

推荐：

```text
用 Python Turtle 绘制五角星
Python Turtle circle() 方法详解
Turtle 如何设置画笔颜色和填充颜色
```

不推荐：

```text
今天来学习一个有趣的内容
Python 教程
绘图方法总结（二）
```

### Description

建议长度为 50 至 120 个中文字符，直接说明文章内容和结果。

推荐：

```yaml
description: "讲解 Turtle circle() 的 radius、extent 和 steps 参数，并通过圆、半圆和多边形示例说明它们的区别。"
```

不要在摘要中堆砌关键词，也不要重复标题后就结束。

### 更新时间

只有文章内容发生实质变化时才修改 `lastmod`，例如：

- 修正代码错误。
- 替换失效下载地址。
- 增加新的 Python 版本说明。
- 重写主要章节。

仅修改错别字或标点时，不必更新 `lastmod`。

---

## 9. 本地预览

首次进入项目：

```bash
cd restored-nuxt
npm ci
```

开发：

```bash
npm run dev
```

终端会先生成内容数据，再启动 Nuxt。打开终端显示的本地地址即可预览。

保存 Markdown 后应看到类似输出：

```text
[content] Markdown changed, rebuilding article data...
```

重点检查：

- 首页“最新文章”是否出现新文章。
- `/posts/` 是否出现新文章。
- 文章 URL 是否正确。
- 分类页是否收录。
- 标题、摘要和日期是否正确。
- 图片是否加载。
- 代码块能否复制。
- `##`、`###` 是否出现在右侧目录。
- 上一篇、下一篇是否正确。
- 搜索能否按标题、摘要、分类或标签找到文章。
- 桌面端和手机宽度下是否都易读。

---

## 10. 发布前验证

按顺序执行：

```bash
npm run check
```

检查流程包含：

| 命令 | 作用 |
| --- | --- |
| `npm run build:data` | 重新生成文章数据、路由、站点地图和 RSS。 |
| `npm run typecheck` | 检查 Nuxt/Vue/TypeScript 类型问题。 |
| `npm run generate` | 生成可部署的静态网站。 |
| `npm run verify` | 检查全部路由、站内资源、sitemap、RSS、404 和部署目录。 |

本地静态输出通常位于：

```text
.output/public/
```

Cloudflare Pages 构建环境会自动切换 Nitro Pages 预设，输出目录为：

```text
dist/
```

需要本地检查生产产物时，可运行：

```bash
npm run preview
```

或按照 `nuxt generate` 输出的提示预览实际生成目录；本地通常是 `.output/public`，Cloudflare Pages 是 `dist`。

### 发布前文章检查清单

- [ ] 文件位于 `content/posts/` 根目录。
- [ ] 文件名、`slug` 和 URL 没有与旧文章冲突。
- [ ] `title` 清楚说明主题。
- [ ] `date` 使用正确时区。
- [ ] `draft` 已设为 `false`。
- [ ] 分类名称与登记值完全一致。
- [ ] 标签已登记，或已明确接受暂不生成标签页。
- [ ] `description` 不是空值或正文机械截断。
- [ ] 图片使用站点绝对路径，并已实际打开检查。
- [ ] Python 示例已运行。
- [ ] 没有本机路径、账号、密钥或个人信息。
- [ ] 桌面端和移动端均已检查。
- [ ] `npm run check` 成功，且部署产物校验通过。
- [ ] `sitemap.xml`、`rss.xml` 和 `robots.txt` 已随构建更新。

---

## 11. 常见问题

### 保存后文章没有出现

依次检查：

1. 文件是否在 `content/posts/` 根目录。
2. 文件是否以 `.md` 结尾。
3. 文件名是否以 `_` 开头。
4. `draft` 是否仍为 `true`。
5. front matter 的起止 `---` 是否完整。
6. YAML 数组缩进是否正确。
7. 终端是否显示内容构建报错。

可以手动执行：

```bash
npm run build:data
```

### 文章 URL 冲突

检查 `url` 和 `slug`。两个文件 URL 相同时构建会失败；若是修订旧文，应直接编辑原文件，否则应更换新文章的 `slug`。

### 分类或标签页没有文章

- 分类、标签名称可能与登记值不完全一致。
- 新术语可能尚未加入 `content/taxonomy_terms.json`。
- 修改后可能还没有重新执行 `npm run build:data`。

### 缩略图不显示

- 检查文件是否确实位于 `public/` 下。
- front matter 中应写 `/images/posts/example.png`，不要写 `public/images/posts/example.png`。
- 检查大小写是否一致。
- 如果没有封面图，删除 `thumbnail`，让系统使用正文第一张图或分类占位图。

### 修改文章后没有生效

全部文章源文件位于 `content/posts/`。开发服务器会监听该目录；如果未启动开发服务器，可手动运行：

```bash
npm run build:data
```

或者重启开发服务器。

### 页面存在，但生产构建没有生成

确认文章 URL 已进入：

```text
content-data/routes.json
```

如果没有，先检查草稿状态和 front matter，再运行 `npm run build:data`。

---

## 12. 推荐维护原则

1. **全部内容只写入 `restored-nuxt/content/posts/`。** Hugo 恢复目录仅作为历史备份。
2. **旧 URL 尽量不变。** 修订旧文时直接编辑原文件并保留 URL，不要另建相似页面。
3. **图片与文章一起命名。** 文章 `draw-a-flower.md` 可配套使用 `draw-a-flower-cover.png`、`draw-a-flower-step-1.png`。
4. **一篇文章解决一个核心问题。** 过大的主题拆成系列，并通过站内链接串联。
5. **先确保代码正确，再优化表达。** 教程中可运行的结果比篇幅更重要。
6. **工具类内容标注核验日期。** 下载链接、安装步骤和软件版本需要定期复查。
7. **不要直接编辑生成文件。** `content-data/*.json`、`public/sitemap.xml`、`public/rss.xml` 和 `public/robots.txt` 会在下次构建时被覆盖。
