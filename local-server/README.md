# 本地后端（付费云开发前的替代）

在没有微信云开发时，用本地 Node 服务替代云函数 + 云数据库，让 DEV 可以真实读写测试。
**零 npm 依赖**（Node 内建 `http`）。跑的就是 `cloudfunctions/*` 的同一份源码，买云开发后原样上传即可。

## 启动

```bash
node local-server/server.js
```

默认监听 `http://localhost:3000`；数据库在 `local-server/.data/dev.json`（已 gitignore）。

环境变量：
- `PORT`：端口，默认 3000
- `OWNER_OPENIDS`：owner 白名单（逗号分隔），默认 `dev-owner-openid`
- `LOCAL_DB_FILE`：数据库路径

## 小程序端接入

在 `config.js` 把 `dataBackend` 设为 `'local'`，`localBaseUrl` 指向本服务，`localDevOpenId` 设为你要模拟的身份
（要以 owner 测就填 `dev-owner-openid`，要以普通客户测就填别的字符串）。
微信开发者工具需勾选「详情 → 本地设置 → 不校验合法域名」。

切回云开发：把 `dataBackend` 改回 `'cloud'`，无需改业务代码。

## 冒烟测试

```bash
node local-server/smoke-test.js
```

自起服务、跑登录→建商品→读回→持久化→鉴权拒绝的真实闭环并断言。

## 原理

- `server.js` 用 `Module._load` 钩子把 `require('wx-server-sdk')` 换成 `wxShim.js`。
- `wxShim.js` 用一个 JSON 文件实现云数据库最小 API（`where/limit/get`、`doc.get/update/set/remove`、`add`、`command.in`、`serverDate`）。
- 请求串行化，逐个设置 `getWXContext().OPENID` 再调云函数 `main`。
- 本地取不到真实微信 OpenID，由客户端传入 `localDevOpenId`，仅本地生效。
