# 勋港 Windows 安装包

这个目录用于生成 Windows 桌面安装包。桌面应用启动后会打开：

```text
https://www.xungang.xin/
```

## 生成安装包

```bash
cd desktop
npm install
npm run dist
```

输出文件在：

```text
desktop/dist/
```

把生成的安装程序重命名为：

```text
xungang-setup.exe
```

并上传到服务器：

```text
/www/furniture_ai_retouch/downloads/xungang-setup.exe
```
