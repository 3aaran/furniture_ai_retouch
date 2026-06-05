# xungang.xin 正式域名部署说明

本项目推荐前后端同域部署：

- 前端访问地址：`https://www.xungang.xin`
- 后端 API：`https://www.xungang.xin/api`
- 本地生成或本地存储图片：`https://www.xungang.xin/files`

证书包 `25179222_www.xungang.xin_nginx.zip` 内包含：

- `www.xungang.xin.pem`
- `www.xungang.xin.key`

当前证书覆盖 `www.xungang.xin` 和 `xungang.xin`，有效期到 `2026-08-20 07:59:59`，到期前需要续签并替换服务器证书。

## 1. DNS

在域名解析中配置：

```txt
xungang.xin      A      你的服务器公网 IP
www.xungang.xin  A      你的服务器公网 IP
```

## 2. 前端构建

前端生产环境继续使用同域 `/api`：

```env
VITE_API_BASE_URL=/api
```

构建：

```bash
npm --prefix frontend install --legacy-peer-deps --no-audit --no-fund
npm --prefix frontend run build
```

将 `frontend/dist` 上传或复制到服务器：

```bash
/var/www/xungang/frontend/dist
```

## 3. 后端环境

服务器上的 `backend/.env` 建议使用：

```env
NODE_ENV=production
APP_ENV=production
APP_NAME=勋港
PORT=3001

PUBLIC_BASE_URL=https://www.xungang.xin
FRONTEND_ORIGIN=https://www.xungang.xin,https://xungang.xin

DB_HOST=你的线上 MySQL 地址
DB_PORT=3306
DB_USER=你的线上数据库账号
DB_PASSWORD=你的线上数据库密码
DB_NAME=furniture_ai_retouch

JWT_SECRET=至少32位以上随机字符串

STORAGE_DRIVER=local
LOCAL_STORAGE_ROOT=storage
LOCAL_PUBLIC_PATH=/files

AUTO_INIT_DB=false
RESET_LEGACY_TABLES=false
ALLOW_AI_FALLBACK=false
```

如果后续切到 OSS，再把 `STORAGE_DRIVER=oss` 和 OSS 参数补齐。

## 4. Nginx

把证书文件放到服务器：

```bash
sudo mkdir -p /etc/nginx/certs/xungang
sudo cp www.xungang.xin.pem /etc/nginx/certs/xungang/www.xungang.xin.pem
sudo cp www.xungang.xin.key /etc/nginx/certs/xungang/www.xungang.xin.key
sudo chmod 600 /etc/nginx/certs/xungang/www.xungang.xin.key
```

把 `docs/xungang-nginx.conf` 复制到服务器：

```bash
sudo cp docs/xungang-nginx.conf /etc/nginx/conf.d/xungang.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 5. 后端启动

示例使用 PM2：

```bash
npm --prefix backend install --legacy-peer-deps --no-audit --no-fund
pm2 start backend/src/server.js --name xungang-api
pm2 save
```

## 6. 上线验证

逐项检查：

```txt
https://www.xungang.xin
https://www.xungang.xin/api/health
https://www.xungang.xin/manifest.json
https://www.xungang.xin/manifest.webmanifest
https://www.xungang.xin/sw.js
```

如果 `/api/health` 正常返回 JSON，说明 HTTPS、Nginx 反代和 Node 后端已经连通。

## 7. PWA 验证

HTTPS 正常后，再检查 PWA 文件：

```bash
curl -I https://www.xungang.xin/manifest.webmanifest
curl -I https://www.xungang.xin/manifest.json
curl -I https://www.xungang.xin/sw.js
curl -I https://www.xungang.xin/pwa-icon-192.png
curl -I https://www.xungang.xin/pwa-icon-512.png
```

`manifest.webmanifest` 建议返回：

```txt
HTTP/1.1 200 OK
Content-Type: application/manifest+json
```

`manifest.json` 建议返回：

```txt
HTTP/1.1 200 OK
Content-Type: application/json
```

如果返回 `application/octet-stream`，在 Nginx 的 manifest location 内加入：

```nginx
location = /manifest.webmanifest {
    try_files $uri =404;
    default_type application/manifest+json;
    add_header Cache-Control "public, max-age=300";
}
```

然后执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

浏览器验证方式：

- Chrome / Edge 打开 `https://www.xungang.xin/`。
- 打开开发者工具的 Application 面板。
- 检查 Manifest 是否能读取应用名称、图标和 start_url。
- 检查 Service Workers 是否显示 `/sw.js` 且状态为 activated。
- 地址栏右侧或菜单中应出现“安装应用”入口。
