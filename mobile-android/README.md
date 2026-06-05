# 勋港 Android 安装包

这个目录用于生成安卓 APK。App 启动后会打开：

```text
https://www.xungang.xin/
```

## 环境要求

- JDK 17 或更高版本
- Android Studio
- Android SDK

## 初始化安卓工程

```bash
cd mobile-android
npm install
npx cap add android
npx cap sync android
```

## 生成 APK

调试包：

```bash
npm run build:debug
```

输出位置通常是：

```text
mobile-android/android/app/build/outputs/apk/debug/app-debug.apk
```

正式包需要在 Android Studio 里生成签名 APK：

```text
Build -> Generate Signed Bundle / APK -> APK
```

生成后重命名为：

```text
xungang.apk
```

并上传到服务器：

```text
/www/furniture_ai_retouch/downloads/xungang.apk
```
