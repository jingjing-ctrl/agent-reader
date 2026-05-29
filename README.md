# AgentReader

基于 Vue 3 + Vite 的智能电子书阅读器。支持 EPUB / PDF 导入、书架管理、连续滚动阅读、自定义分组，并集成 DeepSeek 实现段落翻译与 AI 文学分析。

## 功能概览

### 账号与登录
- 账号密码登录（演示账号：`admin` / `123456`）
- 登录态持久化，未登录自动跳转登录页

### 我的书架
- 导入 `.epub` 或 `.pdf` 电子书，本地解析为段落并分页存储（PDF 需含可选文字层，扫描版暂不支持）
- **自定义分组**：创建 / 重命名 / 删除分组，按「全部 / 未分组 / 自定义分组」筛选
- **批量管理**：多选书籍，批量删除、批量转移到指定分组
- 每页展示 6 本，超出分页浏览；分组与页码状态会记住
- 渐变封面、阅读进度条、单本移入分组

### 阅读器
- 连续滚动阅读（虚拟列表拼接多页，翻页无跳变）
- 键盘：← → 翻页，↑ ↓ 与滚轮在边界处切换上下页
- 字号调节（A− / A+，支持快捷键），进度自动保存
- 左侧目录与阅读统计，底部页码滑块
- **返回书架**：离开前保存当前阅读位置

### AI 助手（需配置 DeepSeek API）
- 选中段落后进行 **英文翻译**
- **智能分析**：文学视角解读当前段落
- 分析结果在右侧面板展示，切换段落时保留会话上下文

### 设置
- 配置 DeepSeek API Key（仅存浏览器本地）
- 浅色 / 深色主题切换（顶栏快捷切换）

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3、Vue Router、Pinia |
| 构建 | Vite 5 |
| 电子书 | epub.js、pdf.js（pdfjs-dist） |
| AI | DeepSeek API（经开发代理转发） |
| 存储 | localStorage、IndexedDB（书籍正文与原文件） |

## 项目结构

```
agent-reader/
├── src/
│   ├── views/              # 页面：登录、书架、阅读器、设置
│   ├── components/         # 通用组件与 library/* 书架子组件
│   ├── composables/        # useLibraryPage、useReaderStream、useToast
│   ├── stores/             # auth、books、settings
│   ├── utils/              # EPUB/PDF 解析、DeepSeek、封面样式等
│   └── styles/             # 全局样式与书架页面样式
├── vite.config.js          # 开发服务器与 DeepSeek 代理
└── package.json
```

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装与运行

```bash
npm install
npm run dev
```

浏览器访问终端提示的地址（默认 [http://localhost:5173](http://localhost:5173)）。

### 演示流程

1. 使用 `admin` / `123456` 登录
2. 在书架点击 **导入书籍**，选择 `.epub` 或 `.pdf` 文件
3. 进入阅读器；在 **设置** 中填写 DeepSeek API Key 后可使用翻译与分析
4. 阅读时点击段落，在右侧 **AI 助手** 中发起翻译或分析

## 配置 DeepSeek

AI 功能需要 DeepSeek API Key：

1. 登录后进入右上角 **设置**（或顶栏齿轮）
2. 在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建 API Key 并粘贴保存
3. 开发环境下，请求通过 Vite 代理 `/api/deepseek` 转发至 `https://api.deepseek.com`，避免浏览器跨域限制

> API Key 仅保存在本机浏览器，不会上传至本项目以外的第三方服务（除 DeepSeek 官方接口外）。

## 构建与预览

```bash
# 生产构建
npm run build

# 本地预览构建结果
npm run preview
```

构建产物输出至 `dist/` 目录。

## 数据说明

- **书架元数据**（书名、分组、阅读进度等）：`localStorage`
- **书籍正文与原文件**：浏览器 IndexedDB
- 清除站点数据会导致书架与书籍内容丢失，请注意备份重要电子书文件

## 常见问题

**导入书籍后提示「正文未加载」？**  
可能是本地缓存损坏，请在书架删除该书后重新导入。

**PDF 导入失败或内容为空？**  
仅支持含文字层的 PDF；纯扫描/图片 PDF 需先 OCR 后再导入。

**从阅读器返回书架后页码不对？**  
请使用阅读区顶栏 **返回书架** 按钮离开，会主动保存进度；直接刷新页面可能未及时写入。

**AI 翻译 / 分析报错？**  
请检查设置中的 API Key 是否有效、账户余额是否充足，并确认开发服务已启动（代理仅在 `npm run dev` 时生效）。

## 许可证

本项目为私有演示项目（`private: true`）。使用 epub.js、pdf.js、DeepSeek 等服务时请遵守各自许可与使用条款。
