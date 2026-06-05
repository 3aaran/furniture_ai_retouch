# 勋港安装包目录

这个目录用于线上固定下载入口：

- `xungang-setup.exe`：Windows 安装包
- `xungang.apk`：Android 安装包
- `latest.json`：安装包版本清单，前端用它检查是否有新版本

`.exe` 和 `.apk` 不提交到 GitHub，需要在打包后上传到服务器：

```text
/www/furniture_ai_retouch/downloads/xungang-setup.exe
/www/furniture_ai_retouch/downloads/xungang.apk
```

`latest.json` 需要提交到 GitHub。每次正式发布安装包时，同步更新里面的版本号、下载地址和更新说明。
