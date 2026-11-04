# Romantic Garden

一个可以亲手布置、写祝福、送给朋友的 3D 花朵卡片网站。

## 功能

- 全屏花园、黑白背景，以及随鼠标移动的立体转动与分层视差。
- 十种带纹理的 GLB 植物，支持拖动、缩放、XYZ 旋转、镜像、复制、删除、层级调整和撤销重做。
- 卡片正反面植物分别编辑，鼠标拖动卡片可翻到背面。
- 三只大小、颜色不同的蝴蝶，飞行、悬停并落在花朵上。
- 祝福和布局自动保存在当前浏览器；支持 PNG、离线互动 HTML、卡片链接与系统分享。
- 独立只读收卡页面，卡片快照保存在链接片段中，没有公开卡片列表。

## 本地运行

需要 Node.js 20 或更新版本。浏览器所需的 Three.js 和 lz-string 已随项目保存，无需构建或 API 密钥即可运行。

```sh
npm run dev
```

打开 http://127.0.0.1:5186/ 使用编辑器。

另开一个终端启动收卡页面：

```sh
npm run dev:viewer
```

收卡页面位于 http://127.0.0.1:5187/ ，需要完整的 `#card=...` 链接才能显示卡片。

```sh
npm run check:all
```

## 项目结构

```text
dist/                   编辑器静态文件，可直接部署
  assets/flowers/        原始透明花朵图片
  assets/models/         GLB 模型和配置
  assets/butterflies/    蝴蝶动画素材和来源记录
  lib/                  3D 渲染、编辑、翻面、导出和分享模块
  vendor/               浏览器依赖及许可证
viewer/dist/            独立只读收卡页面，可单独部署
server.mjs              本地静态服务器
scripts/                模型修补脚本
```

## 部署与分享地址

编辑器部署目录是 `dist/`，收卡页面部署目录是 `viewer/dist/`。当前线上编辑器保持私密，收卡页面允许持完整链接的人查看。

编辑器： https://budarina-flower-cards-nov02.wiliamking44.chatgpt.site/

收卡页面： https://budarina-card-viewer-nov03.wiliamking44.chatgpt.site/

迁移收卡域名时，更新 `dist/lib/card-link.js` 的 `VIEWER_ORIGIN`（并同步 `viewer/dist/lib/card-link.js`）。本地联调可设为 `http://127.0.0.1:5187`；发送给朋友时必须使用朋友可访问的线上地址。收卡页面支持部署到子路径。

仓库的私有设置不等同于网站访问控制。自行部署编辑器时，需要由托管平台设置登录或访问限制。卡片链接持有者能够查看并转发卡片；链接内容未加密，也无法单独撤销。浏览器草稿没有包含在仓库中。

## 素材与依赖

花朵模型由用户提供的图片通过 Tripo 生成。运行网站复用已生成的模型，不会调用 Tripo 或产生生成费用。蝴蝶源素材记录见 `dist/assets/butterflies/provenance.json`。

Three.js 和 lz-string 的许可证保存在各自 `dist/vendor/` 目录。项目素材不因上传仓库而自动获得开源授权。

离线互动 HTML 使用每株植物当前角度的图片图层，支持翻面与视差，不包含完整 GLB 编辑器。GLB 模型编辑在网页内完成。

## GitHub Pages 发布

发布配置已准备在 `.github/workflows/pages.yml`。需要先在仓库 Settings → Pages 中启用 GitHub Actions 发布，并确认账号套餐支持当前仓库可见性。启用后推送 main 会自动检查并部署。

目标编辑器网址： https://jeef1109.github.io/romantic-garden/

目标收卡页面： https://jeef1109.github.io/romantic-garden/viewer/

GitHub Pages 版本可公开访问；每个人的草稿仍只保存在各自浏览器。分享链接已配置为上面的 GitHub Pages 收卡地址。原来的 Sites 编辑器访问限制保持不变。
