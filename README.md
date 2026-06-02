# 网易云音乐悬浮窗

在屏幕最前端显示网易云音乐切歌信息的桌面悬浮窗，支持封面图、歌名、歌手的淡入淡出展示，附带可视化配置面板。

## 功能

* **切歌弹出**：检测网易云音乐 PC 客户端切歌，在屏幕前端显示歌曲信息
* **纵向布局**：封面图在上、歌名/歌手在下，圆角卡片风格
* **淡入淡出**：可调节动画速度和显示时长
* **常驻模式**：始终显示当前播放歌曲
* **跑马灯滚动**：超长歌名/歌手名自动滚动
* **文字阴影**：在复杂背景下保持文字可读
* **可视化配置**：位置、尺寸、动画、样式、行为均可通过设置面板调节
* **穿透点击**：悬浮窗不拦截鼠标事件，不影响正常操作
* **封面获取**：通过 iTunes API 自动搜索匹配专辑封面

## 下载

从 [Releases](https://github.com/yourusername/netease-floating-window/releases) 下载最新版 `网易云音乐悬浮窗.zip`，解压后双击运行`NeteaseFloatingWindow.exe`即可。

## 使用

1. 打开**网易云音乐 PC 客户端**并播放歌曲
2. 运行 `NeteaseFloatingWindow.exe`
3. 切歌时屏幕左下方弹出悬浮窗
4. 双击系统托盘图标打开设置面板
5. 右键托盘图标可退出

## 配置项

|类别|参数|范围|默认值|
|-|-|-|-|
|位置|距左边 / 距下边|0-3000 / 0-2000 px|20 / 20|
|尺寸|窗口宽 / 高 / 封面大小|150-800 / 150-600 / 60-400 px|260 / 320 / 200|
|动画|淡入 / 淡出 / 显示时长|0-5000 / 0-5000 / 1-120 秒|400 / 400 / 5000 ms|
|样式|圆角 / 字号 / 颜色 / 透明度 / 阴影|见设置面板|—|
|行为|常驻显示|开 / 关|关|

## 开发

### 环境要求

* [Node.js](https://nodejs.org/) 20+
* [.NET SDK](https://dotnet.microsoft.com/download) 10.0+
* Windows 10/11

### 构建

```bash
npm install
dotnet publish smtc-helper/smtc-helper.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o out/smtc-helper
$env:ELECTRON\_RUN\_AS\_NODE=$null
npx electron-vite build
npx electron-vite preview
```

### 打包

```bash
npx electron-builder --win portable
# 输出在 release/ 目录
```

## 技术架构

```
┌─────────────────────┐   stdout JSON   ┌──────────────────────┐
│  C# SMTC Monitor    │ ───────────────→│  Electron Main Proc  │
│  窗口标题轮询        │                 │  窗口管理 / IPC       │
│  iTunes API 封面     │                 │  配置持久化          │
└─────────────────────┘                 └──────────┬───────────┘
                                                   │ IPC
                                    ┌──────────────┴──────────────┐
                                    ▼                             ▼
                            ┌──────────────┐            ┌──────────────┐
                            │  悬浮窗窗口   │            │  配置面板     │
                            │  React + CSS  │            │  React UI    │
                            │  淡入淡出动画  │            │  实时预览    │
                            └──────────────┘            └──────────────┘
```

* **歌曲检测**：C# 程序通过 Win32 API 枚举网易云窗口标题，解析歌名/歌手
* **封面获取**：调用 iTunes Search API 搜索匹配的专辑封面
* **UI 框架**：Electron + React + TypeScript + Vite
* **配置存储**：JSON 文件持久化（`%APPDATA%/netease-floating-window/config.json`）

## 注意事项

* 需要网易云音乐 PC 客户端正在播放歌曲
* 网易云不注册 Windows SMTC，因此通过窗口标题检测（窗口需可见）
* 首次切歌时封面搜索可能有短暂延迟

## License

MIT

