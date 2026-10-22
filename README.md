## 项目简介
不加班平台

## 运行程序

1. 使用 Node.js 20 或 22+，通过仓库固定的 pnpm 9.15.1 安装依赖。依赖以 `pnpm-lock.yaml` 为准。

```shell
corepack enable
pnpm install --frozen-lockfile
```

2. 运行程序

```shell
# 微信小程序端
pnpm run dev:mp-weixin
```

3. 微信开发者工具导入 `/dist/dev/mp-weixin` 目录

生产构建使用 `pnpm run build:mp-weixin`，开发者工具导入 `dist/build/mp-weixin`。提交前运行 `pnpm test`、`pnpm run tsc` 和只读 ESLint 检查。

### 本轮维护的上线顺序

`v=0` 保留旧支付流程和旧后端接口：录制结果使用设备收费配置，历史记录沿用原下载入口；微信支付成功后按原流程下载。旧版已购缓存仅由 v0 只读识别，新购买记录按旧 API 隔离保存，不传给新后端。旧后端 `x.4mr.cn` 不在本次更新范围。

`v=1` 使用新的服务端确认流程。先确认新后端的文件价格快照和支付订单绑定表（`m261023_150000_add_download_price_to_file`），再部署新后端配套文件及微信支付接口，最后发布小程序。如果同一共享库已经由 Node 服务创建等价表结构，先核验结构再登记迁移，不重复执行建表。v1 从后端读取价格与解锁状态，不接受路由价格或本地已购缓存作为下载依据。支付取消可以重试；结果不确定时先查询原订单，确认到账且服务端解锁后才下载。

v1 历史文件的价格保留为 `NULL`，不得批量设为免费。已解锁文件仍可下载；未解锁且金额无法确认的文件会提示联系管理员，需要核实后在服务端补齐价格。本地自动化测试不发起真实扣款；真实微信支付通知仍需在对应环境联调。

构建链已验证 Vite 6.4.5、Vitest 3.2.7 和 Vue 3.5.42；DCloud 插件保持原固定版本，Vite 的兼容例外记录在 `pnpm.peerDependencyRules`。当前依赖审计仍有上游未修复的开发工具依赖告警，详见维护记录，升级时需重新运行微信与 H5 构建。

### API 入口与后端切换

设备拍摄二维码格式为 `https://w.4mr.cn/t?k=TOKEN&v=1`。`k` 是拍摄会话 Token；二维码未带 `v` 或 `v=0` 时，小程序访问旧后端 `https://x.4mr.cn/v2`；`v=1` 时访问新后端 `https://checkin.voxel.cn/api/v2`。旧二维码无需修改，新设备生成二维码时追加 `&v=1`。微信链接进入和小程序内扫码均保留版本号，非法或未支持的版本不会进入录制流程。

小程序记住最近一次扫码的后端，记录、用户和设备功能跟随该后端；从未扫码时使用下述默认新 API。两套登录 Token、云存储临时凭据、SDK 实例和待确认支付订单按 API 隔离。旧未分域登录缓存会重新登录，不会猜测归属后迁移到另一后端。版本号用于扫码分流，与设备软件上报的 `device.version` 无关。详见 [设备二维码版本记录](docs/superpowers/plans/2026-10-23-device-qr-version.md)。

默认、开发和生产的 v1 配置使用 `https://checkin.voxel.cn/api/v2`。该入口由服务端反向代理到 B0 主后端与 B1 备用后端，自动切换由代理负责；小程序不重试网络失败的业务写操作。启用前需在微信小程序管理后台的 request 合法域名中保留 `https://x.4mr.cn` 并加入 `https://checkin.voxel.cn`，保持开发者工具 `urlCheck: true`。

管理后台扫码登录仍使用二维码中的 origin，重新获取目标后端的微信凭据；默认与环境配置同时信任 `https://checkin.voxel.cn`，并保留 `https://x.b0.01xr.com`、`https://x.b1.01xr.com` 和 `https://x.4mr.cn` 以兼容现有二维码。二维码的 canonical origin 必须保持根 origin，不包含路径：`https://checkin.voxel.cn` 的登录与审批请求使用 `/api/v2`，其他可信直连 origin 继续使用 `/v2`。B0 与 B1 生成新二维码时应统一使用 `https://checkin.voxel.cn` 作为 canonical origin。

统一域名不会自动保证现有 Bearer Token 可在两个后端通用；上线前须验证 B0 签发的 Token 在 B1 仍能通过鉴权，并确认扫码登录状态可跨后端继续处理。腾讯云 COS 的上传、下载和删除仍由 COS SDK 直接访问存储域名。


### 工程结构解析
```

├── .husky                     # Git Hooks
├── .vscode                    # VS Code 插件 + 设置
├── dist                       # 打包文件夹（可删除重新打包）
├── src                        # 源代码
│   ├── components             # 全局组件
│   ├── composables            # 组合式函数
│   ├── pages                  # 主包页面
│       ├── index               # 首页
│       ├── my                  # 我的
│       └── login               # 登录页
│   ├── services               # 所有请求
│   ├── static                 # 存放应用引用的本地静态资源的目录
│       ├── images              # 普通图片
│       └── tabs                # tabBar 图片
│   ├── stores                 # 全局 pinia store
│       ├── modules             # 模块
│       └── index.ts            # store 入口
│   ├── styles                 # 全局样式
│       └── fonts.scss          # 字体图标
│   ├── types                  # 类型声明文件
│       └── component.d.ts      # 全局组件类型声明
│   ├── utils                  # 全局方法
│   ├── App.vue                # 入口页面
│   ├── main.ts                # Vue初始化入口文件
│   ├── pages.json             # 配置页面路由等页面类信息
│   ├── manifest.json          # 配置appid等打包信息
│   └── uni.scss               # uni-app 内置的常用样式变量
├── .editorconfig              # editorconfig 配置
├── .eslintrc.cjs              # eslint 配置
├── .prettierrc.json           # prettier 配置
├── .gitignore                 # git 忽略文件
├── index.html                 # H5 端首页
├── package.json               # package.json 依赖
├── tsconfig.json              # typescript 配置
└── vite.config.ts             # vite 配置
```
