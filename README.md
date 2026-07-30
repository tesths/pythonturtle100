# 玩转 Python 海龟绘图

面向少儿编程入门场景的 Nuxt 4 静态内容站。项目包含 122 篇已发布文章、分类与标签数据、文章图片资源，以及构建前生成的站点索引数据。

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `app/` | Nuxt 页面、布局、组件和全站样式。 |
| `content/posts/` | 全部文章源文件，统一使用 YAML front matter 和 Markdown 正文。 |
| `content/taxonomy_terms.json` | 分类与标签定义。 |
| `public/images/posts/` | 文章图片资源。 |
| `scripts/` | 内容构建、开发服务器和部署产物校验脚本。 |
| `tests/` | 内容数据、路由和文章源格式测试。 |
| `site.config.mjs` | 站点域名、标题、描述和顶部菜单配置。 |

## 本地运行

项目固定使用 Node.js 24.18.0，版本记录在 `.node-version`。

```bash
npm ci
npm run dev
```

开发服务器会先执行内容构建，再启动 Nuxt。保存 `content/posts/` 下的 Markdown 文件后，开发脚本会自动重新生成内容数据。

## 文章维护

- 新文章复制 `content/posts/_template.md` 后修改。
- 已发布文章的 `url` 要保持稳定，例如 `/turtle100-1/`。
- 文章图片放在 `public/images/posts/` 下，并在正文和 `thumbnail` 中使用 `/images/posts/...` 路径。
- 正文使用 Markdown，代码块使用 fenced code block 并标注 `python`。
- 分类和标签必须先登记在 `content/taxonomy_terms.json`。
- 发布前确认 `description`、图片 alt 文本、代码示例和移动端显示正常。

详细写作规则见 [`ADDING_ARTICLES.md`](./ADDING_ARTICLES.md)。

## 发布前检查

```bash
npm run check
```

该命令会依次执行：

1. `npm run build:data`
2. `npm run test`
3. `npm run typecheck`
4. `npm run generate`
5. `npm run verify`

本地静态预设通常输出：

```text
.output/public/
```

Cloudflare Pages 构建环境会让 Nuxt 自动使用 Pages 预设，并输出：

```text
dist/
```

## 构建产物

内容构建会生成：

```text
content-data/site.json
content-data/routes.json
public/sitemap.xml
public/rss.xml
public/robots.txt
```

这些文件由脚本生成，不应手工编辑。提交源码时也不要提交 `content-data/`、`.output/` 或 `dist/`。

## Cloudflare Pages

完整操作和故障排查见 [`DEPLOYMENT.md`](./DEPLOYMENT.md)。

建议使用 Git 集成，构建配置为：

```text
Build command: npm run generate
Build output directory: dist
Node.js version: 24.18.0
```

域名配置通过环境变量管理：

- 默认使用正式地址 `https://pythonturtle100.com`。
- 在 Cloudflare Pages 环境变量中设置 `SITE_URL=https://pythonturtle100.com` 并重新部署。
- `sitemap.xml`、RSS、robots.txt、canonical、Open Graph 和 JSON-LD 会统一使用该地址。
