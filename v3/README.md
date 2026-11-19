# 千年木艺 · 桌面营造工坊 V3

基于原有木作设计工坊升级的完整源码。使用 React / Vinext、Three.js、Cloudflare D1 和 R2。首页使用用户 OBJ 中的真实建筑构架，并新增 19 款独立的斗拱三维展示模型；斗拱旧版教程位于 `public/legacy/`。

线上网站：https://qian-nian-wood-workshop.easyjay70.chatgpt.site

本轮将说明书仅作为内部建模参考。用户端展示真实可交互的三维几何和三维渲染封面，没有 PDF 阅读器、图纸图片或 PDF 下载入口。

## 本地运行

需要 Node.js 22.13 或更新版本。本次开发使用 Node.js 24。

在项目根目录依次运行：

```powershell
npm install
npm run setup:local
npm run dev -- --port 4193 --hostname 127.0.0.1
```

浏览器打开 http://127.0.0.1:4193/ 。本地预览点击“登录”使用框架提供的 `seedy@sites.test` 测试身份，`setup:local` 只在本机创建对应的工作人员配置。此模拟登录不会编入线上生产站。

首次运行需要联网安装依赖；三维模型、花纹与旧版教程均已打包为本地静态资源。关闭终端会停止预览。

## 页面入口

- `/`：模型馆首页。
- `/?view=teaching`：19 款斗拱模型，按柱头、补间、上昂、转角、建筑节点及明清分类，也可按铺作和构件名称筛选。
- `/?model=teaching-sipu-zhutou`：模型详情、构件信息、爆炸图与分步动画。添加 `&step=3` 可直接打开第 3 步。
- `/?model=timber-hall` 与 `/?model=timber-pavilion`：两组建筑构架。
- `/?view=studio`：自由搭建、纹饰、教程与导出。
- `/?view=ai`：AI 灵感页面；供应商未接通时不生成图片。
- `/?view=mine`：登录后查看云端方案、分享与撤销分享。
- `/?view=staff`：仅工作人员可读取的接待工作台。
- `/?share=<公开标识>`：公开只读方案快照。
- `/legacy/?case=chinese`、`dougong`、`shelf`：保留的原有模型教程。

## 云端与权限

- 线上身份由 Sites 的 ChatGPT 登录提供，用户记录按服务端用户 ID 隔离。
- `ADMIN_EMAILS` 为逗号分隔的工作人员邮箱，作为运行时 secret 配置。当前网站所有者账号已在部署环境配置，源码不包含真实账号资料。
- 私有方案、咨询和缩略图需要所有者或工作人员权限。公开分享只包含指定方案快照，不公开会话或联系方式；可以撤销。
- 方案保存是不可变快照；客服提交会新建一份快照，编辑搭建草稿不会改变已提交内容。
- 咨询只有“待接待 / 沟通中 / 已报价 / 已关闭”。没有支付、自动下单或自动定价。
- D1 结构在 `db/schema.ts`，迁移在 `drizzle/`。本地 `.wrangler/` 数据与线上数据库独立，不会上传测试数据。
- 浏览器草稿只在当前设备；真正跨设备的作品使用云端保存。

## AI 外包接口

参阅 [AI 接口对接](docs/AI接口对接.md)。运行时配置 `AI_ENDPOINT` 与 `AI_API_KEY` 后重新部署。浏览器不会接触密钥。未提供真实供应商前，生图联调不算完成。

## 素材与算法

`lib/workshop.ts` 定义模块、方案格式、参数限制、连接关系、装配规划和 CSV。

`components/Scene.tsx` 提供三维展示、模型加载、移动、纹饰贴合和装配演示。

`components/WorkshopApp.tsx` 提供首页、模型馆与搭建区；`components/Workspaces.tsx` 提供云端作品、客服与 AI 页面。

`lib/teaching.catalog.json` 与 `public/assets/teaching/` 收录 19 款模型，共 1,177 件展示构件、436 个编排步骤。构件网格按需加载，全部压缩模型数据合计约 247 KB；封面为模型的实际三维渲染。`components/TeachingGallery.tsx` 提供模型馆、构件点选、动作播放、暂停、重播、连续播放、速度调节、木材外观、预览比例和导出。

模型预览方案可以保存本机草稿或云端快照、公开分享，并将当前模型、外观、比例和演示步骤提交给客服。比例单位与展示构件数量不能直接作为加工尺寸或实物料包数量，详见 [三维模型验收](docs/三维模型验收.md)。

`public/assets/architecture/` 为实际 OBJ 的压缩 GLB；`public/assets/patterns/` 为 FBX 提取的 18 款真实纹饰及缩略图。PNG 缩略图由本地三维视图直接渲染。

原始 150 MB / 138 MB 模型不需要下载到访客浏览器。两个大构架分别约 6.8 MB / 7.6 MB（gzip），只在打开对应模型时加载。普通搭建区使用小型斗拱模块和按需纹饰。

请参阅 [工程与功能边界](docs/工程与功能边界.md)，了解模块级自动教程、实物验证、建筑分层与雕刻预览的边界。

## 检查与构建

```powershell
npm test
npx tsc --noEmit
npm run build
```

核心测试覆盖承托关系、参数变化、构件数组顺序独立性、悬空、重叠、支撑删除、无效参数、吸附与固定编号。

本次另完成本地接口和真实 Chrome 端到端验收：匿名访问隔离、方案保存、分享及撤销、客服消息与报价、AI 未配置状态、装配播放器、纹饰、撤销重做、渲染与手机布局。真实外包 AI、实物加工及跨浏览器长期性能不在本次已验收范围。

模型几何及步骤的可编辑生成器位于 `scripts/teaching/`。修改后执行 `npm run models:build`，会校验、重新压缩全部 19 款网格并更新目录统计；中间结果存放在忽略提交的 `.teaching-build/`。封面不会自动重拍，修改模型外形后需要同步更换对应的 WebP 渲染图。

## 部署

`.openai/hosting.json` 保留此项目的 Sites ID 和 D1 / R2 逻辑绑定。生产构建输出到 `dist/server/` 和 `dist/client/`，通过 Sites 插件发布；托管平台负责实际资源绑定、数据库迁移与身份登录。

不要上传 `.dev.vars`、`.env`、`.wrangler`、`.sites-runtime` 或原始密钥。迁移到其他平台时需要适配身份入口和数据库 / 对象存储绑定；不能将此完整服务直接当成 GitHub Pages 静态 HTML 托管。
