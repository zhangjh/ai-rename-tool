# Image Rename Tool

一个基于 AI 分析的图像文件重命名工具，支持在线 AI 分析和离线规则分析两种模式。

## 功能特性

- 🔍 **AI 图像分析**：使用 Google Gemini AI 分析图像内容并生成描述性文件名
- 📁 **批量重命名**：支持批量处理整个目录的图像文件
- 📅 **日期前缀**：自动添加 YYYY-MM-DD 格式的日期前缀到文件名
- 👀 **预览模式**：在重命名前预览将要进行的更改
- 🛡️ **安全模式**：支持 dry-run 模式，不会实际修改文件
- 📊 **详细报告**：提供处理结果和错误信息

## 安装

1. 克隆或下载项目
2. 安装依赖：
```bash
npm install
```

## 配置

编辑 `config.js` 文件来配置 API 设置：

```javascript
export const aiConfig = {
  // API 配置
  apiKey: "your-api-key-here",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
  modelName: 'gemini-1.5-flash',
  
  // 其他设置...
};
```

## 使用方法

### 基本命令

```bash
# 预览重命名（在线模式）
node index.js preview <目录路径>

# 执行重命名（在线模式）
node index.js rename <目录路径>

# 扫描目录并显示分析结果
node index.js scan <目录路径>
```

### 离线模式

当您的网络环境无法访问 Google AI API 时（如企业防火墙限制），可以使用离线模式：

```bash
# 预览重命名（离线模式）
node index.js preview <目录路径>

# 执行重命名（离线模式）
node index.js rename <目录路径>
```

### 其他选项

```bash
# 显示当前配置
node index.js --show-config

# 使用自定义 API 密钥
node index.js preview <目录路径> -k "your-api-key"

# 使用自定义模型
node index.js preview <目录路径> -m "gemini-1.5-pro"

# 预览模式（不实际重命名）
node index.js rename <目录路径> --dry-run

# 跳过确认提示
node index.js rename <目录路径> -y
```

## 网络问题解决方案

### 问题：API 访问被阻止

如果您遇到以下错误：
```
Error fetching from https://generativelanguage.googleapis.com/v1beta/models/...: fetch failed
Application Blocked - FortiGate Application Control
```

这通常是由于企业网络防火墙阻止了对 Google AI API 的访问。

### 解决方案

1. **使用离线模式**（推荐）：
   ```bash
   node index.js preview <目录路径>
   ```

2. **联系网络管理员**：
   - 请求将 `generativelanguage.googleapis.com` 添加到防火墙白名单
   - 或请求允许访问 Google AI API

3. **使用代理服务器**（如果企业允许）：
   - 配置代理服务器来访问外部 API

4. **使用其他 AI 服务**：
   - 修改代码以支持其他可用的 AI 服务

## 离线模式工作原理

离线模式使用基于规则的图像分析：

1. **文件名分析**：分析现有文件名中的关键词
2. **词汇匹配**：识别包含有意义词汇的文件名
3. **清理规则**：移除特殊字符，统一格式
4. **时间戳回退**：如果无法生成有意义的名称，使用时间戳

## 文件名格式

### 日期前缀格式
所有重命名的文件都会自动添加日期前缀，格式为：`YYYY-MM-DD_描述性名称.扩展名`

**示例：**
- `2025-08-04_cat_on_windowsill.jpg`
- `2025-08-04_workflow_diagram.png`
- `2025-08-04_image_20250804053439.webp` (回退名称)

### 日期来源
- **AI 分析成功**：使用当前日期作为前缀
- **回退模式**：使用文件的修改时间作为前缀

## 支持的文件格式

- JPEG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- TIFF (.tiff)
- WebP (.webp)

## 示例

```bash
# 预览重命名 test_images 目录中的文件
node index.js preview test_images

# 实际重命名文件
node index.js rename test_images

# 使用在线 AI 分析（需要网络访问）
node index.js preview test_images
```

### 重命名结果示例

**原始文件名：**
- `IMG_001.jpg`
- `screenshot.png`
- `workflow_diagram.webp`

**重命名后：**
- `2025-08-04_cat_sitting_on_windowsill.jpg`
- `2025-08-04_computer_screen_with_text.png`
- `2025-08-04_business_process_workflow.webp`

## 注意事项

- 离线模式的分析效果不如 AI 分析准确
- 建议在重命名前使用预览模式检查结果
- 确保有足够的磁盘空间和文件权限
- 建议备份重要文件

## 故障排除

### 常见问题

1. **API 连接失败**：
   - 检查网络连接
   - 验证 API 密钥
   - 使用离线模式

2. **文件权限错误**：
   - 确保有读写权限
   - 检查文件是否被其他程序占用

3. **模型不可用**：
   - 检查模型名称是否正确
   - 尝试使用不同的模型

### 获取帮助

如果遇到问题，请：
1. 检查错误信息
2. 尝试使用离线模式
3. 查看配置文件设置
4. 联系技术支持

## 许可证

MIT License