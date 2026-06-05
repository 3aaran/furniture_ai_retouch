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

## 更新规则

### 只改网站内容

如果只改前端页面、后端接口、提示词、样式、业务功能：

- 重新部署网站即可。
- PWA 会读取新网页。
- Windows EXE 和 Android APK 因为只是打开 `https://www.xungang.xin/`，用户下次打开软件也会看到新网页。
- 不需要重新生成 EXE/APK。

### 改安装包壳

如果改了桌面壳或安卓壳本身，例如图标、窗口配置、启动逻辑、文件下载权限、系统权限、包名、自动更新逻辑：

- 需要重新生成 EXE/APK。
- 上传覆盖 `/www/furniture_ai_retouch/downloads/` 中的安装包。
- 已安装用户不会自动替换壳程序，需要重新下载安装，除非后续实现自动更新机制。

### Windows 版本更新

修改：

```text
desktop/package.json
```

把 `version` 从 `1.0.0` 改成新版本，例如：

```json
"version": "1.0.1"
```

重新打包：

```bash
cd desktop
npm install
npm run dist
```

复制输出安装包：

```powershell
Copy-Item "desktop\dist\勋港 Setup 1.0.1.exe" "downloads\xungang-setup.exe" -Force
```

### Android 版本更新

修改：

```text
mobile-android/android/app/build.gradle
```

每次重新发布 APK 时，必须增加 `versionCode`，并更新 `versionName`：

```gradle
versionCode 2
versionName "1.0.1"
```

然后构建：

```bash
cd mobile-android
npm run build:debug
```

调试 APK 输出通常在：

```text
mobile-android/android/app/build/outputs/apk/debug/app-debug.apk
```

复制为：

```text
downloads/xungang.apk
```

正式发布建议用 Android Studio 生成签名 APK。

## 自动更新说明

当前安装包没有实现壳程序自动更新：

- 网站内容会自动更新，因为 EXE/APK 打开的是线上域名。
- EXE/APK 壳程序不会自动更新。
- Windows 若要壳程序自动更新，需要接入 Electron autoUpdater，并提供更新源、签名和 `latest.yml`。
- Android 若不上架应用商店，直接下载 APK 不能静默自动安装；最多只能在网页里提示用户下载新版 APK，安装仍需要用户确认。
