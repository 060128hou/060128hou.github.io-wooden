# AI 生图外包对接

目前没有配置外包服务，界面明确显示“等待外部生图服务接入”，生成按钮不可用。不会返回模拟图片。

在 Sites 运行时配置两个 secret，重新部署后生效：

- `AI_ENDPOINT`：外包服务的 HTTPS 基础 URL，不包含 `/jobs`。
- `AI_API_KEY`：只在服务器使用的访问密钥。

网站服务器向外包方发送 `Authorization: Bearer <AI_API_KEY>`。浏览器不会获得密钥。

## 创建任务

`POST {AI_ENDPOINT}/jobs`

```json
{"prompt":"用户填写的木作外观描述","size":"1024x1024","purpose":"tabletop-wood-model"}
```

异步返回：

```json
{"id":"provider-job-id","status":"queued"}
```

也支持同步返回：

```json
{"id":"provider-job-id","status":"succeeded","images":["https://your-provider.example/image.png"]}
```

## 查询任务

`GET {AI_ENDPOINT}/jobs/{provider-job-id}`

```json
{"id":"provider-job-id","status":"running","images":[]}
```

完成时返回 `status: succeeded` 与 `images`（1～4 个可供访客直接打开的 HTTPS 图片地址）；失败时返回 `status: failed`。图片 URL 应具有合理的访问有效期。网站每 4 秒查询，单次等待最长 5 分钟。供应商负责图片存储、内容过滤、额度控制与生成费用。

网站端已实现：登录校验、任务按用户隔离、创建限流、服务超时、失败状态和配置缺失提示。未接到真实服务前，不能声称端到端生图已验收。

## 交付验收

1. 提供测试环境、密钥和一组成功 / 失败样例。
2. 校对同步或异步响应格式、图片浏览器访问权限、超时与限额。
3. 连续测试创建、轮询、失败重试；检查另一账号不能读取他人的任务。
4. 图像仅用于外观参考，不自动转为有加工关系的三维模型。
