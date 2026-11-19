# 千年木艺 · 桌面营造工坊 V3

[打开正式网站](https://qian-nian-wood-workshop.easyjay70.chatgpt.site/) · [斗拱三维模型馆](https://qian-nian-wood-workshop.easyjay70.chatgpt.site/?view=teaching) · [自由搭建](https://qian-nian-wood-workshop.easyjay70.chatgpt.site/?view=studio) · [客服工作台](https://qian-nian-wood-workshop.easyjay70.chatgpt.site/?view=staff)

原 GitHub Pages 网址继续可用，会自动进入新版网站。原版模型与教程保留在 [v2](https://060128hou.github.io/060128hou.github.io-wooden/v2/?case=chinese)。

## 本次更新

- 新增 19 款斗拱三维展示模型：四至八铺柱头与补间、上昂、转角、明清和古建节点；用户端只展示模型，不提供 PDF 或图纸入口。
- 1,177 件展示构件、436 个编排步骤；支持爆炸图、点选构件、装配播放、预览导出、保存分享和提交客服。展示分件数量与比例单位不能直接用于加工。
- 随附可编辑模型生成器，可运行 `npm run models:build` 重建网格与步骤数据。

- 首页两组完整木构建筑模型，支持旋转、分层查看与展开；斗拱教程保留。
- 7 种桌面模块自由搭建：选择、移动、吸附、尺寸、旋转、复制、删除、撤销重做。
- 18 款从原 FBX 提取的真实纹饰，可放在指定构件表面、调节位置和角度，导出渲染图。
- 基于最终模块连接关系生成分步装配动画，检查悬空、重叠与简化装入路径。
- JSON 方案与教程、CSV 构件清单、PNG 渲染图；登录后支持云端快照和公开分享。
- 站内客服、工作人员接待列表、方案快照、消息与人工报价。没有支付和工厂自动下单。
- AI 生图页面和外包适配已完成，供应商未提供接口前不生成模拟结果。

## 源码与本地启动

新版完整源码在 [v3](./v3/)，详细说明见 [v3/README.md](./v3/README.md)。需要 Node.js 22.13 或更新版本。

```powershell
cd v3
npm install
npm run setup:local
npm run dev -- --port 4193 --hostname 127.0.0.1
```

本地打开 http://127.0.0.1:4193/ 。本地使用测试登录；线上使用 Sites 登录和服务端权限。

## 工程边界

自动教程限定于受规则约束的标准模块，斗拱和顶架按预装组处理；大型建筑目前提供空间分层观察，不能当作实际施工说明。花纹只作视觉预览。榫卯、公差、承重和实际装配需人工复核与样件验证。

[完整功能与工程边界](./v3/docs/工程与功能边界.md) · [AI 外包接口文档](./v3/docs/AI接口对接.md)

云端方案、客服和登录由完整网站服务承载；GitHub Pages 负责入口，不能直接运行数据库和服务端接口。
