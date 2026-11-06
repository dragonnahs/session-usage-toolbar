# Session Usage Toolbar

PI-Desktop 插件：在输入框工具栏放一个用量图标，点开即可查看当前会话的 Token 消耗。

仓库：<https://github.com/dragonnahs/session-usage-toolbar> · 许可证：MIT

## 功能

- 使用官方 `composerControl` 插槽显示入口
- 使用 `pi.session.getActive()` 跟随当前会话
- 使用 `pi.usage.listTurns()` 分页读取已完成回合的用量事实
- 展示输入、缓存命中、缓存创建、输出、思考、总 Token、缓存命中率
- 按模型统计并列出逐回合明细
- 无可用数据时显示空状态，不伪造零用量
- 不读取或保存消息正文，不修改宿主会话和输入框

## 安装

已打包版本：`dist/com.dragonnahs.session-usage-toolbar-0.3.0.piplug`

1. PI-Desktop → 插件 → 右上角菜单 → **安装插件包**
2. 选择 `dist/com.dragonnahs.session-usage-toolbar-0.3.0.piplug`
3. 确认权限：`renderer.extension`（高风险）、`usage.read`
4. 打开任意会话，点击输入框工具栏右侧的用量图标

开发加载：插件页 → 右上角菜单 → **加载本地插件** → 选择本目录。

插件 id：`com.dragonnahs.session-usage-toolbar`（0.3.0 起；旧 id `local.session-usage-toolbar` 会被识别为另一个插件，请先卸载旧的）

安装包 SHA-256：`c4da8d3b5ebba2ffc87b41c57d06db9ab6b0c0917fbceac6dcc57ff2ca64d736`

## 要求与限制

- PI-Desktop >= 0.17.0，并要求宿主支持 `composerControl`、`plugin.call` 和 `pi.usage.listTurns()`。
- 只统计宿主提供的已完成回合；流式中间状态不会计入。
- 覆盖层是插件自绘 UI，不替换宿主聊天路由；关闭后恢复聊天。
- `renderer.extension` 是高风险权限。只应加载你信任的插件源码。

## 本地验证

在本目录运行：

```text
node --check main.js
node --check renderer/index.mjs
node --test scripts/usage.test.mjs
node scripts/check.mjs
```

如果 PI-Desktop 开发工具可用，再运行官方 `PluginCheck` 和 `PluginPack` 验证安装包。
