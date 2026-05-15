# 家具修图 v2.3（基于 v2.x 风格按规划调整）

本版本在 v2.x 深色金色风格和原有 MySQL 项目基础上继续修改，没有改成 v3 的简化/假数据结构。

## 启动

1. 修改 `backend/.env` 中的 MySQL 密码：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=furniture_ai_retouch
```

2. 安装并启动：

```bash
npm run install:all
npm run dev
```

启动后会自动创建数据库和表。

## 测试账号

```text
平台管理员：admin / admin123456
门店管理员：13800000000 / merchant123456
门店人员：13900000000 / staff123456
```

## 本版重点

- 保留 v2.x 原来的深色金色整体风格。
- 保留真实 MySQL：自动建库、建表、种子数据。
- 商家是管理单位，不作为独立页面登录；审核通过后自动生成门店管理员手机号账号。
- 平台管理员审核申请时，若填写有效邀请码，会按系统配置给新门店和邀请门店发放奖励额度。
- 平台管理员商家管理按额度从高到低排序；禁用商家时禁用其下账号，启用时恢复原账号状态。
- 门店管理员/门店人员用手机号密码开通；体验用户一键生成账号密码并按配置自动过期字段保存。
- 管理员系统配置增加 AI功能消耗、邀请码奖励比例、体验账户有效期等配置。
- 图片生成仍为本地模拟 AI，后续可替换 `backend/src/aiService.js` 接入真实模型。


## 前端样式模块化说明

本版本已基于最新上传项目整理 CSS 结构，样式统一入口为：

```jsx
import './styles/index.css';
```

原有样式未删除，已原样迁移到：

```txt
frontend/src/styles/legacy/style.css
frontend/src/styles/legacy/workbench-fixes.css
```

这样可以保证页面效果不变，同时后续可以按页面单独维护 CSS。


## 云部署环境变量

前端不要写死后端地址，使用 `frontend/.env.production`：

```env
VITE_API_BASE_URL=https://api.your-domain.com
```

后端使用 `backend/.env` 配置云 MySQL 和域名：

```env
DB_HOST=你的云MySQL地址
DB_PORT=3306
DB_USER=你的数据库账号
DB_PASSWORD=你的数据库密码
DB_NAME=furniture_ai_retouch
FRONTEND_ORIGIN=https://www.your-domain.com
PUBLIC_BASE_URL=https://api.your-domain.com
```

## AI 模型接入（本版本已做成可扩展结构）

后端 AI 适配目录：

```txt
backend/src/ai/
├─ configService.js
├─ promptService.js
├─ providerService.js
└─ adapters/
   ├─ mock.js
   ├─ custom.js
   ├─ zhipu.js
   ├─ aliyun.js
   └─ jimeng.js
```

以后切换模型时：

- **同平台换模型**：直接在前端系统配置里改 Provider / Model / API Path 即可，不需要改业务代码。
- **换到新平台**：新增 `backend/src/ai/adapters/xxx.js`，再到 `backend/src/ai/providerService.js` 注册一下即可。
- **单独适配某个平台**：只改对应文件，例如：
  - 智谱 / CogView：`backend/src/ai/adapters/zhipu.js`
  - 阿里云 / 通义万相：`backend/src/ai/adapters/aliyun.js`
  - 即梦：`backend/src/ai/adapters/jimeng.js`
  - 通用 OpenAI-like / 自定义 HTTP：`backend/src/ai/adapters/custom.js`

也就是说，后续你一般只需要改**一个适配器文件**，不会再去改工作台、用户管理、额度、资源库这些业务页面。

## 本地/线上环境切换

项目现在按 `backend/.env` 和 `frontend/.env` 切换环境，不需要修改业务代码。

### 前端

```env
# 推荐本地和线上都保持 /api
VITE_API_BASE_URL=/api
```

本地开发时 `frontend/vite.config.js` 会把 `/api` 和 `/files` 代理到 `http://localhost:3001`。线上部署时由 Nginx 把 `/api` 代理到后端 `127.0.0.1:3001`，`/files` 可代理到后端或改为对象存储/CDN 域名。

### 后端

`backend/.env` 内保留了本地配置块和线上配置块。切换环境时只取消一套配置的注释，另一套必须全部注释。

关键参数：

```env
# 数据库连接，本地 MySQL 和云 MySQL 共用同一套代码
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=furniture_ai_retouch

# 前端来源，线上改成正式域名；多个域名用英文逗号分隔
FRONTEND_ORIGIN=http://localhost:5173

# 后端公共访问地址，AI 平台需要公网访问图片时使用
PUBLIC_BASE_URL=http://localhost:3001

# local 保存到 backend/storage；oss/cos 为对象存储预留入口
STORAGE_DRIVER=local
LOCAL_STORAGE_ROOT=storage
LOCAL_PUBLIC_PATH=/files

# 生产环境必须关闭，避免启动时自动建表或写演示数据
AUTO_INIT_DB=false
RESET_LEGACY_TABLES=false
```

生产环境建议使用云 MySQL，并在确认对象存储 SDK 上传逻辑接入后再启用 `STORAGE_DRIVER=oss` 或 `STORAGE_DRIVER=cos`。
