# Prompt Studio

可视化管理 AI 提示词的工具，支持 Mac / Windows / 移动端。

## 功能

- ✅ 创建 / 编辑 / 删除提示词
- ✅ 文件夹管理（支持嵌套）
- ✅ 标签系统
- ✅ 收藏功能
- ✅ 变量系统 `{{variable}}` 语法 + 高亮
- ✅ 变量填充面板（填入变量值 → 生成最终提示词）
- ✅ 全文搜索
- ✅ 深色 / 浅色主题
- ✅ 导入 / 导出 JSON
- ✅ 回收站（软删除 + 恢复）
- ✅ 历史版本

## 技术栈

- **框架**: Tauri 2.x（Rust 后端 + Web 前端）
- **前端**: React 19 + TypeScript + Vite
- **样式**: Tailwind CSS v4
- **状态**: Zustand
- **编辑器**: TipTap（富文本 + 变量高亮）
- **存储**: 本地 JSON 文件（Tauri AppData）

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 平台支持

| 平台 | 状态 |
|------|------|
| macOS | ✅ v1.0 |
| Windows | ✅ v1.0 |
| Web | 🔜 v1.2 |
| iOS/Android | 🔜 v2.0 |
