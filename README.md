## 项目简介
不加班平台

## 运行程序

1. 安装依赖

```shell
# npm
npm i --registry=https://registry.npmmirror.com

# pnpm
pnpm i --registry=https://registry.npmmirror.com
```

2. 运行程序

```shell
# 微信小程序端
pnpm run dev:mp-weixin
```

3. 微信开发者工具导入 `/dist/dev/mp-weixin` 目录

### API 入口与后端切换

默认、开发和生产配置统一使用 `https://checkin.voxel.cn/v2`。该入口由服务端反向代理到 B0 主后端与 B1 备用后端，自动切换由代理负责；小程序继续使用现有请求流程，不重试业务写操作。启用前需在微信小程序管理后台的 request 合法域名中加入 `https://checkin.voxel.cn`，并保持开发者工具 `urlCheck: true`。

管理后台扫码登录仍使用二维码中的 origin，重新获取目标后端的微信凭据；默认与环境配置同时信任 `https://checkin.voxel.cn`，并保留 `https://x.b0.01xr.com`、`https://x.b1.01xr.com` 和 `https://x.4mr.cn` 以兼容现有二维码。B0 与 B1 生成新二维码时应统一使用 `https://checkin.voxel.cn` 作为 canonical origin。

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
