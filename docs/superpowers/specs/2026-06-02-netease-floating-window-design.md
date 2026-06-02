# 网易云音乐悬浮窗 - 设计文档

## 概述

一个 Windows 桌面悬浮窗软件，在网易云音乐 PC 客户端切歌时，在屏幕最前端以淡入淡出动画显示当前歌曲的封面图（圆角）、歌名、歌手信息。附带可视化配置界面，可调节位置、大小、样式、动画速度等参数。

## 技术方案

**Electron + C# 辅助程序**。C# 程序负责通过 Windows SMTC API 获取播放信息，Electron 负责 UI 展示。

## 架构

```
┌─────────────────────┐     stdout JSON     ┌──────────────────────┐
│  C# SMTC Monitor    │ ──────────────────→ │  Electron Main Proc  │
│  (子进程)            │                     │  - smtc-bridge       │
│  Windows.Media API  │                     │  - config-store      │
└─────────────────────┘                     │  - IPC handler       │
                                            └──────┬───────────────┘
                                                   │ IPC
                                   ┌───────────────┼───────────────┐
                                   ▼                               ▼
                          ┌──────────────┐              ┌──────────────┐
                          │ 悬浮窗窗口    │              │ 配置面板窗口  │
                          │ alwaysOnTop  │              │ 普通窗口      │
                          │ frameless    │              │ React UI     │
                          │ transparent  │              │ 实时预览     │
                          └──────────────┘              └──────────────┘
```

## 组件设计

### 1. C# SMTC Monitor (`smtc-helper/`)

- .NET 8 控制台应用，发布为单文件可执行文件
- 使用 `Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager` 监听系统媒体控件
- 筛选来源为"网易云音乐"的会话
- 切歌检测：比较 title + artist 组合是否变化
- 输出 JSON Line 到 stdout：`{"title":"...","artist":"...","thumbnailBase64":"..."}`
- 自动等待/重连网易云音乐进程

### 2. Electron 主进程 (`electron/`)

- **smtc-bridge**: spawn C# 程序，逐行读取 stdout JSON，解析并转发到渲染进程
- **config-store**: 使用 electron-store 持久化用户配置
- **窗口管理**: 创建悬浮窗（alwaysOnTop, frameless, transparent, skipTaskbar）和配置面板（普通窗口）
- **IPC**: 主进程 ↔ 渲染进程的双向通信

### 3. 悬浮窗渲染进程 (`src/floating/`)

- 接收切歌事件，展示封面图（圆角）、歌名、歌手
- CSS transition 实现淡入淡出
- 支持两种模式：
  - **切歌显示**: 切歌时淡入，N 秒后淡出
  - **常驻模式**: 始终显示当前歌曲
- 右键菜单：打开配置 / 退出

### 4. 配置面板渲染进程 (`src/config/`)

- React + TypeScript 构建
- 分类标签页：位置、尺寸、动画、样式、行为
- 滑块/颜色选择器/数字输入等控件
- 修改即时生效（通过 IPC 实时更新悬浮窗）
- 保存/恢复默认按钮

## 配置项

```typescript
interface AppConfig {
  position: {
    x: number; y: number;
    anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
  };
  size: { width: number; height: number; };
  animation: {
    fadeInDuration: number;   // 淡入时长 ms, 默认 500
    fadeOutDuration: number;  // 淡出时长 ms, 默认 500
    displayDuration: number;  // 显示时长 ms, 默认 5000
  };
  style: {
    windowBorderRadius: number;
    coverBorderRadius: number;
    songNameFontSize: number;
    artistFontSize: number;
    songNameColor: string;
    artistColor: string;
    backgroundColor: string;
    backgroundOpacity: number;
    backgroundBlur: number;
    fontFamily: string;
  };
  behavior: {
    alwaysShow: boolean;  // 常驻模式
  };
}
```

## 数据流

1. 网易云切歌 → Windows SMTC 更新
2. C# 程序检测到 MediaPropertiesChanged 事件
3. 提取 title, artist, thumbnail → 转为 base64 → 输出 JSON 到 stdout
4. Electron 主进程读取 JSON → 通过 IPC 推送给悬浮窗
5. 悬浮窗触发淡入动画，展示歌曲信息
6. displayDuration 后触发淡出（非 alwaysShow 模式）

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Electron 33 |
| 构建 | electron-vite |
| 前端 | React 18 + TypeScript |
| 样式 | CSS Modules |
| 配置持久化 | electron-store |
| SMTC 采集 | C# .NET 8 单文件发布 |
| 打包 | electron-builder |

## 注意事项

- C# 程序需随 Electron 打包发布，路径通过 `process.resourcesPath` 定位
- 悬浮窗需设置 `setIgnoreMouseEvents(false)` 允许交互，但可选穿透
- SMTC 可能同时有多个媒体源（如浏览器播放视频），需按进程名过滤
- 封面缩略图来自 SMTC Thumbnail 属性，是 Windows 系统标准媒体元数据
