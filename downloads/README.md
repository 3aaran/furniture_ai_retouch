# 勋港安装包目录

这个目录用于保存安装包版本清单。正式安装包建议放到 OSS/CDN，不继续由 ECS 直接分发。

- `latest.json`：安装包版本清单，前端用它检查是否有新版本

正式下载地址建议：

```text
https://download.xungang.xin/xungang-setup.exe
https://download.xungang.xin/xungang.apk
```

`.exe` 和 `.apk` 不提交到 GitHub。每次正式发布安装包时，同步更新 `latest.json` 中的版本号、下载地址和更新说明。
