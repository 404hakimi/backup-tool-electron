# 应用图标说明

## 图标文件要求

为了让应用在不同平台上正确显示图标，需要准备以下文件：

### Windows
- `icon.ico` - 256x256 像素，ICO 格式
- 包含多个尺寸: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256

### macOS  
- `icon.icns` - ICNS 格式
- 包含多个尺寸: 16x16@1x, 16x16@2x, 32x32@1x, 32x32@2x, 128x128@1x, 128x128@2x, 256x256@1x, 256x256@2x, 512x512@1x, 512x512@2x

### Linux
- `icon.png` - 512x512 像素，PNG 格式

### 系统托盘
- `tray-icon.png` - 16x16 或 32x32 像素，PNG 格式

## 图标生成方法

### 方法 1: 使用在线工具
1. 打开 `generate-icon.html` 在浏览器中
2. 右键点击 canvas，保存为 PNG (512x512)
3. 使用在线工具转换：
   - Windows ICO: https://convertico.com/
   - macOS ICNS: https://iconverticons.com/online/

### 方法 2: 使用命令行工具

#### 安装 electron-icon-builder
```bash
npm install -g electron-icon-builder
```

#### 生成所有平台图标
```bash
electron-icon-builder --input=./icon-source.png --output=./resources
```

### 方法 3: 使用设计工具
- Figma
- Sketch
- Adobe Illustrator
- Inkscape (免费)

## 设计建议

1. **简洁明了**: 图标应该易于识别
2. **对比度**: 确保在深色和浅色背景下都清晰可见
3. **可缩放**: 在小尺寸下仍然清晰
4. **品牌一致性**: 与应用主题颜色一致

## 当前图标设计

- 主色调: #18a058 (绿色)
- 图标元素: 云朵 + 向上箭头
- 寓意: 自动备份到云端

## 快速使用

如果没有准备图标文件，应用会自动生成一个简单的默认图标（绿色圆点）。

建议在正式发布前替换为专业设计的图标。
