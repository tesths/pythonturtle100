# 玩转 Python 海龟绘图

旧站迁移后的 Nuxt 4 静态站点源码。项目包含 122 篇迁移文章、分类与标签数据，以及旧站文章所需的图片和附件。

## 项目结构

当前仓库根目录就是活动站点，不依赖相邻恢复目录。

| 路径 | 说明 |
| --- | --- |
| `app/` | Nuxt 页面、布局、组件和全站样式。 |
| `content/posts/` | 全部文章源文件，旧文章和后续新文章都放在这里。 |
| `content/taxonomy_terms.json` | 分类与标签定义。 |
| `public/wp-content/uploads/` | 旧站迁移图片和静态附件。 |
| `scripts/` | 内容构建、开发服务器和部署产物校验脚本。 |
| `site.config.mjs` | 站点域名、标题、描述和顶部菜单配置。 |

## 本地运行

项目固定使用 Node.js 24.18.0，版本记录在 `.node-version`。

```bash
npm ci
npm run dev
```

## 发布前检查

```bash
npm run check
```

该命令会依次执行内容数据生成、内容数据测试、类型检查、静态生成和部署产物验证。本地静态预设通常输出：

```text
.output/public/
```

Cloudflare Pages 构建环境会让 Nuxt 自动使用 Pages 预设，并输出：

```text
dist/
```

GitHub Actions 已配置同样的检查流程，推送到 `main`、创建 PR 或手动触发时都会运行 `npm ci` 和 `npm run check`。

## 维护文档

- [`ADDING_ARTICLES.md`](./ADDING_ARTICLES.md)：新增或维护文章时使用。
- [`DEPLOYMENT.md`](./DEPLOYMENT.md)：Cloudflare Pages 配置、发布流程和故障排查。
- [`MIGRATION.md`](./MIGRATION.md)：WordPress 到 Nuxt 4 的迁移交接、目录职责和已知限制。

## Git 提交范围

应该提交：

- `app/`：Nuxt 页面、布局、组件和样式。
- `content/posts/`：全部文章源文件。
- `content/taxonomy_terms.json`：分类和标签定义。
- `public/`：文章实际使用的图片、字体、favicon 和静态附件。
- `scripts/`：内容构建、开发和部署验证脚本。
- `tests/`：内容数据和路由一致性测试。
- `.github/workflows/check.yml`：CI 检查流程。
- `.node-version`、`site.config.mjs`、`nuxt.config.ts`、`tsconfig.json`。
- `package.json` 和 `package-lock.json`。
- `.gitignore`、`README.md`、`MIGRATION.md`、`ADDING_ARTICLES.md`。

不应该提交：

- `node_modules/`、`.nuxt/`、`.output/`、`dist`。
- `content-data/`、`public/sitemap.xml`、`public/rss.xml`、`public/robots.txt`，这些文件由构建脚本生成。
- `.env*`、`.dev.vars*`、`.npmrc` 等本机配置或密钥文件。
- `.wrangler/`、`.playwright-cli/`、日志、覆盖率和编辑器缓存。
- 4 个未被文章引用的旧安装压缩包；如需恢复下载，应改放 Cloudflare R2 等对象存储。

## Cloudflare Pages

完整操作和故障排查见 [`DEPLOYMENT.md`](./DEPLOYMENT.md)。

建议使用 Git 集成，构建配置为：

```text
Build command: npm run generate
Build output directory: dist
Node.js version: 24.18.0
```

域名配置不再写死在代码里：

- 尚未购买新域名时，默认使用稳定地址 `https://pythonturtle100.pages.dev`。
- 购买并绑定新域名后，在 Cloudflare Pages 环境变量中设置 `SITE_URL=https://新域名`，然后重新部署。
- `sitemap.xml`、RSS、robots.txt、canonical、Open Graph 和 JSON-LD 会统一使用该地址。

项目构建不依赖相邻目录，GitHub 仓库中的文件即可独立生成完整站点。
