# 勋港应用下载入口部署说明

首页安装按钮提供三条入口：

- 网页应用 PWA：由浏览器安装能力决定。电脑推荐 Edge / Chrome；iPhone 使用 Safari 添加到主屏幕；安卓默认浏览器需要支持“安装应用”或“添加到桌面”。
- Windows 安装包：正式环境使用 OSS/CDN 下载地址。
- 安卓安装包 APK：手机端页面适配完成前暂不开放下载。

## OSS 下载地址

安装包不要继续由 ECS/Nginx 直接分发，正式环境建议放到 OSS，并绑定下载域名：

```text
https://download.xungang.xin/xungang-setup.exe
https://download.xungang.xin/xungang.apk
```

前端构建配置：

```env
VITE_WINDOWS_EXE_URL=https://download.xungang.xin/xungang-setup.exe
VITE_ANDROID_APK_ENABLED=false
VITE_ANDROID_APK_URL=https://download.xungang.xin/xungang.apk
```

当前手机端下载入口默认关闭。等手机端页面适配完成后，再改为：

```env
VITE_ANDROID_APK_ENABLED=true
```

同时更新 `downloads/latest.json` 中的 `android.enabled`。

## 推荐线上文件路径

不要优先把安装包直接放进 `frontend/dist`，因为每次重新构建前端时，`dist` 目录可能会被清空。若暂时不用 OSS，可放到项目固定下载目录：

```text
/www/furniture_ai_retouch/downloads/xungang.apk
/www/furniture_ai_retouch/downloads/xungang-setup.exe
/www/furniture_ai_retouch/downloads/latest.json
```

Nginx 增加：

```nginx
location /downloads/ {
    alias /www/furniture_ai_retouch/downloads/;
    add_header Cache-Control "no-store";
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
curl -I https://download.xungang.xin/xungang.apk
curl -I https://download.xungang.xin/xungang-setup.exe
curl -I https://www.xungang.xin/downloads/latest.json
```

## 自定义下载地址

如需修改文件名或放到其他静态目录，在前端构建前配置：

```env
VITE_ANDROID_APK_ENABLED=false
VITE_ANDROID_APK_URL=https://download.xungang.xin/xungang.apk
VITE_WINDOWS_EXE_URL=https://download.xungang.xin/xungang-setup.exe
VITE_APP_RELEASE_MANIFEST=/downloads/latest.json
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
npm run sync
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

## 版本清单和更新提示

仓库中保留 `downloads/latest.json`，它会随 GitHub 部署到服务器。EXE/APK 文件本身不提交到 GitHub，需要打包后上传到同一目录。

当前前端会读取：

```text
https://www.xungang.xin/downloads/latest.json
```

如果用户打开的是 Windows EXE 或 Android APK，并且壳程序携带的版本号低于 `latest.json`，页面会提示“发现新版本”，用户点击后下载新的安装包。

注意：

- 网站内容更新：用户下次打开 EXE/APK 会自动看到新网页，不需要重新安装。
- EXE/APK 壳程序更新：需要重新生成安装包，上传覆盖固定下载文件，并更新 `latest.json`。
- Android APK 不能静默自动安装，必须用户确认安装。
- Windows EXE 若要完全自动后台更新，后续还需要单独接入 Electron autoUpdater、签名证书和更新源。
