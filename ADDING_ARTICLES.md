# 后续文章撰写与发布指南

> 适用项目：`pythonturtle100`  
> 最后更新：2026-07-30  
> 目标读者：后续文章作者、内容维护者和接手开发的工程师

## 1. 快速流程

新文章统一写在：

```text
content/posts/
```

推荐流程：

1. 复制 `content/posts/_template.md`。
2. 将副本改成小写英文文件名，例如 `draw-a-five-pointed-star.md`。
3. 修改 YAML front matter。
4. 使用 Markdown 编写正文。
5. 将文章图片放入 `public/images/posts/`。
6. 本地运行 `npm run dev` 检查页面。
7. 发布前运行 `npm run check`。

只要文章不是草稿，内容构建脚本就会自动把它加入文章列表、搜索数据、静态路由、站点地图和 RSS。

## 2. 文章数据流

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

目录规则：

- 文章必须直接放在 `content/posts/` 下。
- 构建脚本不会递归读取子目录。
- 文件扩展名必须是 `.md`。
- 文件名以 `_` 开头时不会参与构建，`_template.md` 只作为模板。
- 所有正式文章使用 `---` 包围的 YAML front matter。

## 3. Front Matter

推荐格式：

```yaml
---
title: "用 Python Turtle 绘制五角星"
date: "2026-07-17T18:30:00+08:00"
lastmod: "2026-07-17T18:30:00+08:00"
slug: "draw-a-five-pointed-star"
url: "/draw-a-five-pointed-star/"
author: "judi0713@sina.com"
categories:
  - "海龟绘图详解"
tags:
  - "少儿编程"
description: "从转角关系开始，逐步使用 Python Turtle 绘制一个五角星。"
thumbnail: "/images/posts/guides/draw-a-five-pointed-star.png"
draft: false
---
```

| 字段 | 是否必需 | 说明 |
| --- | --- | --- |
| `title` | 必需 | 页面标题、列表标题、搜索标题和 SEO 标题。 |
| `date` | 必需 | 发布时间，推荐使用带时区的 ISO 8601 格式。 |
| `lastmod` | 建议 | 最后修改时间；未填写时使用 `date`。 |
| `slug` | 必需 | 默认文章路径的主体。 |
| `url` | 已发布文章必需 | 显式指定文章访问路径；已发布文章应保持不变。 |
| `author` | 建议 | 作者标识。 |
| `categories` | 必需 | YAML 数组，必须使用已登记分类。 |
| `tags` | 建议 | YAML 数组，必须使用已登记标签。 |
| `description` | 必需 | 文章摘要、搜索描述、列表摘要和 SEO description。 |
| `thumbnail` | 可选 | 列表缩略图和社交分享图候选地址。 |
| `draft` | 必需 | `true` 不参与构建，`false` 正常发布。 |

URL 规则：

- 构建脚本按 `url`、`slug`、文件名的顺序决定文章地址。
- 修订已发布文章时，继续保留原 `url`。
- 两篇文章生成同一个 URL 时，内容构建会失败并列出冲突文件。

## 4. 分类和标签

当前分类：

| 分类名称 | 页面地址 | 适用内容 |
| --- | --- | --- |
| `海龟绘图 100 题` | `/category/turtle100/` | 编号题目、题目解析和参考答案。 |
| `海龟绘图详解` | `/category/turtle-detailed/` | Turtle 概念、方法或绘图原理讲解。 |
| `常用方法索引` | `/category/widely-used-functions/` | API、函数和参数速查。 |
| `常用工具` | `/category/common-tools/` | Python、IDE、Scratch 和开发工具相关内容。 |

当前标签：

- `少儿编程`
- `turtle graphics 100 exercises`
- `海龟绘图 100 题`
- `工具`
- `软件`

新增分类或标签时，需要同时修改 `content/taxonomy_terms.json`，并运行 `npm run build:data` 检查索引页是否生成。

## 5. 正文结构

一篇教程应让读者依次知道“要画什么、为什么这样画、代码如何运行、哪里容易出错”。推荐结构：

````md
开头用一到两段说明本文目标、图形组成和最终效果。

## 最终效果

![五角星绘制完成后的效果](/images/posts/guides/draw-a-five-pointed-star.png)

## 绘图思路

拆解线段、圆弧、角度、循环次数和坐标关系。

## 完整代码

```python
import turtle as t

for _ in range(5):
    t.forward(120)
    t.right(144)

t.done()
```

## 代码讲解

### 确定转角

解释关键代码为什么这样写。

## 常见问题

> 注意：写出读者最容易遇到的问题及解决方法。

## 练习

给出一个可以继续修改参数或扩展图形的小练习。
````

栏目建议：

- `海龟绘图 100 题`：题目、最终效果、解析、完整答案、关键方法、可选扩展。
- `海龟绘图详解`：问题、参数含义、最小示例、图形原理、完整案例、易错点。
- `常用方法索引`：函数签名、参数表、运行效果、最小示例、组合用法。
- `常用工具`：适用系统、下载来源、安装步骤、首次运行设置、验证方法、常见报错。

## 6. Markdown 写法

标题：

- 文章标题已经由 `title` 输出，正文不要写一级标题 `#`。
- 正文章节从 `##` 开始，子章节使用 `###`。
- 右侧目录收集 `##` 和 `###`。

代码块：

````md
```python
import turtle as t

t.circle(100)
t.done()
```
````

代码规范：

- 完整示例必须可以直接运行。
- 统一使用 4 个空格缩进。
- 不省略必要的 `import`。
- 注释说明“为什么”，不要逐行复述代码。

图片：

```md
![五角星绘制完成后的效果](/images/posts/guides/draw-a-five-pointed-star.png)
```

图片规范：

- 文件放在 `public/images/posts/` 下。
- 正文路径和 `thumbnail` 都使用 `/images/posts/...`。
- `alt` 文本说明图片展示的内容，不要只写“图片”。
- 文件名使用小写英文、数字和连字符。
- 不要写本机绝对路径。

链接：

```md
[Python 官方网站](https://www.python.org/)
[站内相关文章](/turtle100-1/)
```

表格：

```md
| 参数 | 含义 | 示例 |
| --- | --- | --- |
| `radius` | 圆的半径 | `100` |
| `extent` | 绘制角度 | `180` |
```

提示：

```md
> 注意：角度为正数时，Turtle 默认逆时针绘制圆弧。
```

## 7. 本地预览

首次进入项目：

```bash
npm ci
```

开发：

```bash
npm run dev
```

重点检查：

- 首页和 `/posts/` 是否出现文章。
- 文章 URL、分类页、标签页是否正确。
- 标题、摘要、日期、图片和代码块是否正常。
- `##`、`###` 是否进入右侧目录。
- 上一篇、下一篇是否正确。
- 搜索能否按标题、摘要、分类或标签找到文章。
- 桌面端和手机宽度下是否都易读。

## 8. 发布前验证

运行：

```bash
npm run check
```

检查流程：

| 命令 | 作用 |
| --- | --- |
| `npm run build:data` | 重新生成文章数据、路由、站点地图和 RSS。 |
| `npm run test` | 检查内容数据、路由、文章格式和图片资源。 |
| `npm run typecheck` | 检查 Nuxt/Vue/TypeScript 类型问题。 |
| `npm run generate` | 生成可部署的静态网站。 |
| `npm run verify` | 检查全部路由、站内资源、sitemap、RSS、404 和部署目录。 |

生成文件包括：

```text
content-data/site.json
content-data/routes.json
public/sitemap.xml
public/rss.xml
public/robots.txt
```

这些文件由构建脚本覆盖，不要手工编辑。

## 9. 发布前清单

- [ ] 文件位于 `content/posts/` 根目录。
- [ ] 文件名、`slug` 和 URL 没有冲突。
- [ ] 已发布文章保留原 `url`。
- [ ] `title` 清楚说明主题。
- [ ] `date` 使用正确时区。
- [ ] `draft` 已设为 `false`。
- [ ] 分类和标签名称与登记值完全一致。
- [ ] `description` 清楚说明文章内容。
- [ ] 图片路径为 `/images/posts/...`，且图片文件存在。
- [ ] 图片 alt 文本可读。
- [ ] Python 示例已运行。
- [ ] 没有本机路径、账号、密钥或个人信息。
- [ ] 桌面端和移动端均已检查。
- [ ] `npm run check` 成功。

## 10. 常见问题

### 保存后文章没有出现

依次检查：

1. 文件是否在 `content/posts/` 根目录。
2. 文件是否以 `.md` 结尾。
3. 文件名是否以 `_` 开头。
4. `draft` 是否仍为 `true`。
5. front matter 的起止 `---` 是否完整。
6. YAML 数组缩进是否正确。
7. 终端是否显示内容构建报错。

### 文章 URL 冲突

检查 `url` 和 `slug`。两个文件 URL 相同时构建会失败；修订已发布文章时应直接编辑原文件并保留原 URL。

### 分类或标签页没有文章

- 分类、标签名称可能与登记值不完全一致。
- 新术语可能尚未加入 `content/taxonomy_terms.json`。
- 修改后可能还没有重新执行 `npm run build:data`。

### 缩略图不显示

- 检查文件是否确实位于 `public/images/posts/` 下。
- front matter 中应写 `/images/posts/example.png`，不要写 `public/images/posts/example.png`。
- 检查大小写是否一致。
- 如果没有封面图，删除 `thumbnail`，让系统使用正文第一张图或分类占位图。

### 页面存在，但生产构建没有生成

确认文章 URL 已进入：

```text
content-data/routes.json
```

如果没有，先检查草稿状态和 front matter，再运行 `npm run build:data`。
