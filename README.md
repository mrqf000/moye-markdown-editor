# 墨页 Markdown 编辑器

墨页是一款面向 Windows 的本地 Markdown 可视化编辑器。它同时提供可视化、源码和阅读模式，并直接读写电脑上的 `.md` 文件。

## 为什么做墨页

AI 生成的内容大多使用 Markdown。为了更方便地查看、整理和继续编辑这些内容，也为了让人与 AI 的协作更顺畅，我通过 Vibe Coding 制作了墨页。后续将继续完善编辑体验，并探索 Agent 的接入。

## 功能

- 多文档标签与本地文件保存
- Markdown 实时排版和源码复制
- 标题、列表、任务、引用、代码块和表格
- 表格行列选择、插入、删除与拖拽调整尺寸
- 代码语言识别和浅色/深色语法高亮
- 剪贴板图片直接粘贴到 Markdown
- 链接标题、卡片和网页展示视图
- 模块拖拽排序与快捷键

## 使用安装包

普通用户可以在仓库右侧的 **Releases** 页面下载最新版 `墨页安装包.exe`。安装后可以把墨页设为 `.md` 文件的默认打开程序。

运行环境：64 位 Windows 10/11。缺少 Microsoft Edge WebView2 Runtime 时，安装程序会自动下载官方运行组件。

## 从源码构建

需要：

- Windows 10/11 x64
- Node.js 20 或更高版本
- Windows PowerShell 5.1 或 PowerShell 7
- .NET Framework 4.8

```powershell
npm install
npm run setup:webview2
npm run build
npm run build:desktop
npm run build:installer
```

构建结果位于 `outputs/`：

- `墨页-Markdown编辑器.html`：单文件浏览器版
- `墨页桌面版/`：可直接运行的桌面版
- `墨页安装包.exe`：单文件 Windows 安装程序

## 测试

先安装 Playwright 使用的 Edge 浏览器支持，然后运行：

```powershell
npx playwright install msedge
npm test
npm run test:installer
```

测试覆盖列表转换、嵌套缩进、表格行列交互、图片粘贴、文档大纲和安装包完整性。

## 项目结构

```text
work/editor*.js       编辑器功能
work/editor-layout.css 界面样式
work/Desktop.cs       Windows 桌面宿主
work/Setup.cs         单文件安装程序
work/build*.ps1       Windows 构建脚本
work/native-tests/    交互回归测试
```

## 隐私

墨页在本地读写文档。外部链接使用系统浏览器打开；只有获取网页标题等网络功能会访问相应网址。

## 第三方组件

项目使用 Lucide、Marked、highlight.js 和 Microsoft WebView2。相关许可证随源码或构建产物保留。

## 许可证

[MIT](LICENSE)

