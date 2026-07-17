# Cloudflare Pages 部署指南

> 最后验证：2026-07-17
>
> GitHub 仓库：`tesths/pythonturtle100`
>
> 当前站点：`https://pythonturtle100.pages.dev`

## 1. 当前部署状态

项目已通过 Cloudflare Pages Git 集成上线。生产分支为 `main`，每次推送到 `main` 后，Cloudflare 会自动安装依赖、构建并发布。

已验证地址：

- 首页：`https://pythonturtle100.pages.dev/`
- 示例文章：`https://pythonturtle100.pages.dev/turtle100-1/`
- 分类页：`https://pythonturtle100.pages.dev/category/turtle100/`
- Sitemap：`https://pythonturtle100.pages.dev/sitemap.xml`
- RSS：`https://pythonturtle100.pages.dev/rss.xml`
- Robots：`https://pythonturtle100.pages.dev/robots.txt`
- 不存在的路径返回真实 HTTP 404。

## 2. Cloudflare Pages 构建配置

在 Cloudflare Dashboard 中进入：

```text
Workers & Pages
→ pythonturtle100
→ Settings
→ Builds & deployments
→ Build configurations
```

配置如下：

```text
Production branch:       main
Framework preset:        None
Build command:           npm run generate
Build output directory:  dist
Root directory:          留空
```

### 为什么输出目录是 `dist`

本地直接运行 `npm run generate` 时，Nitro 通常使用静态预设，输出：

```text
.output/public/
```

Cloudflare Pages 构建环境会被 Nuxt/Nitro 自动识别，并切换为：

```text
Nitro preset: cloudflare-pages
```

因此 Cloudflare 中实际生成的是：

```text
dist/
```

Cloudflare 构建日志应包含：

```text
Generated public dist
Generated dist/_headers
Generated dist/_redirects
You can deploy this build using `npx wrangler pages deploy dist`
```

如果 Cloudflare 的 Build output directory 错填为 `.output/public`，构建本身仍会成功，但发布阶段会报：

```text
Error: Output directory ".output/public" not found.
```

此时只需把 Cloudflare 的 Build output directory 改为 `dist`，不需要修改构建命令。

## 3. 环境变量

在：

```text
Settings
→ Environment variables
```

配置：

```text
NODE_VERSION = 24.18.0
SITE_URL = https://pythonturtle100.pages.dev
```

仓库中的 `.node-version` 也固定为 `24.18.0`。

`SITE_URL` 会统一用于：

- canonical URL
- Open Graph
- JSON-LD
- Sitemap
- RSS
- robots.txt

修改环境变量后必须重新部署，因为这些地址是在构建阶段写入静态文件的。

## 4. 正常发布流程

修改文章或代码后，先在本地运行：

```bash
npm run check
```

确认通过后提交：

```bash
git status
git add .
git commit -m "Describe the change"
git push
```

Cloudflare Pages 会自动构建 `main` 分支。部署完成后，在 Cloudflare 的 Deployments 页面确认状态为 `Success`。

## 5. 发布后检查

每次影响路由、SEO 或内容系统的部署，至少检查：

```text
/
/turtle100-1/
/category/turtle100/
/sitemap.xml
/rss.xml
/robots.txt
/definitely-missing/
```

预期结果：

| 地址 | 预期状态 |
| --- | ---: |
| 首页、文章、分类 | 200 |
| sitemap.xml | 200 |
| rss.xml | 200 |
| robots.txt | 200 |
| 不存在的地址 | 404 |

还应确认 sitemap、RSS、robots.txt、canonical 和 Open Graph 中使用的是当前 `SITE_URL`。

## 6. 购买并绑定新域名

购买新域名并接入 Cloudflare DNS 后：

1. 进入 `Workers & Pages → pythonturtle100 → Custom domains`。
2. 点击 `Set up a custom domain`。
3. 添加根域名，例如 `example.com`。
4. 可同时添加 `www.example.com`，再用 Redirect Rule 将其 301 跳转到根域名。
5. 在 Pages 环境变量中修改：

```text
SITE_URL = https://example.com
```

6. 重新部署生产分支。
7. 检查 sitemap、RSS、robots.txt、canonical 和 Open Graph 均已切换为新域名。

代码中不需要写死新域名。

## 7. 常见故障

### Output directory not found

先看 Nuxt 日志最终生成的是哪个目录：

```text
Generated public dist
```

当前 Cloudflare Pages 项目必须配置：

```text
Build output directory: dist
```

### 没有执行构建命令

日志中应出现：

```text
Executing user command: npm run generate
```

如果没有，检查 Build command 是否为空或误填为 `exit 0`。

### Node.js 版本不正确

日志应出现：

```text
Detected the following tools from environment: nodejs@24.18.0
```

否则检查 `.node-version` 和 Cloudflare 的 `NODE_VERSION`。

### SEO 地址仍是旧域名

检查 `SITE_URL`，保存后重新部署。仅修改环境变量不会改变已经发布的静态文件。

### No Wrangler configuration file found

当前项目通过 Pages Git 集成发布，不需要 `wrangler.toml`。以下日志是正常提示：

```text
No Wrangler configuration file found. Continuing.
No functions dir at /functions found. Skipping.
```

它们不是部署失败原因。
