# 勋港应用下载入口部署说明

首页安装按钮提供三条入口：

- 网页应用 PWA：由浏览器安装能力决定。电脑推荐 Edge / Chrome；iPhone 使用 Safari 添加到主屏幕；安卓默认浏览器需要支持“安装应用”或“添加到桌面”。
- Windows 安装包：默认下载地址 `/downloads/xungang-setup.exe`。
- 安卓安装包 APK：默认下载地址 `/downloads/xungang.apk`。

## 推荐线上文件路径

不要优先把安装包直接放进 `frontend/dist`，因为每次重新构建前端时，`dist` 目录可能会被清空。推荐放到项目固定下载目录：

```text
/www/furniture_ai_retouch/downloads/xungang.apk
/www/furniture_ai_retouch/downloads/xungang-setup.exe
```

Nginx 增加：

```nginx
location /downloads/ {
    alias /www/furniture_ai_retouch/downloads/;
    add_header Cache-Control "public";
}
```

如果暂时不改 Nginx，也可以放在前端 public 目录后重新构建：

```text
/www/furniture_ai_retouch/frontend/public/downloads/xungang.apk
/www/furniture_ai_retouch/frontend/public/downloads/xungang-setup.exe
```

构建后会复制到：

```text
/www/furniture_ai_retouch/frontend/dist/downloads/
```

最后确认浏览器可访问：

```bash
curl -I https://www.xungang.xin/downloads/xungang.apk
curl -I https://www.xungang.xin/downloads/xungang-setup.exe
```

## 自定义下载地址

如需修改文件名或放到其他静态目录，在前端构建前配置：

```env
VITE_ANDROID_APK_URL=/downloads/xungang.apk
VITE_WINDOWS_EXE_URL=/downloads/xungang-setup.exe
```

修改后重新构建并部署：

```bash
pnpm --dir frontend run build
sudo systemctl reload nginx
```

## 注意

前端构建不会自动生成 APK 或 EXE。APK 需要通过 Android 项目打包，EXE 需要通过 Windows 桌面壳打包。当前下载入口负责把这些安装包暴露给用户。
