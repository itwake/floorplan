# 木光之家 · 户型编辑与设计

中文 | [English](README.en.md)

基于原 floorplan 编辑器，导入 [house-design](https://github.com/itwake/house-design) 中我们现有的三套户型方案。打开网站即进入自己的户型编辑，不再显示原示例户型。无需构建。

[在线编辑](https://itwake.github.io/floorplan/) · [原设计展示网站](https://itwake.github.io/house-design/)

## 我们的方案

默认打开方案二「木光 · 亲子储物」。顶部选择器可切换方案一「木光原境」和方案三「木光 · 家政整墙」。`?scheme=wood`、`?scheme=family`、`?scheme=laundry` 可直接定位方案。

墙洞、开门方向、三个外凸飘窗、阳台北东开阔防护、厨房设备、定制柜体、已购 IKEA 家具均按源方案导入。2D/3D 共用毫米坐标；柜体部件按原离地高度构建，800 库折叠门默认关闭。

家具可移动、旋转、改宽深高及颜色；房间可改地面材料。改动自动保存在当前浏览器，各方案互不覆盖。换设备或长期留档，请用「文件 → 导出方案 JSON」；同方案可导入恢复，跨方案导入会拦截。重置只恢复当前方案，可撤销。JSON 是本编辑器备份格式，并非通用 CAD 文件。

注意：导入的是当前设计模型，局部复尺已应用，但全屋总轮廓、墙厚、部分门窗定位仍待核。面积为模型多边形计算，不是产权面积。所有墙体承重性未鉴定，改墙仅为可撤销草案，不可据此施工。3D 家具采用参数化模型，已购家具外包尺寸保留，不宣称品牌产品的精确外观。

## 功能

**2D 平面布置**
- 按原始户型 1:60 / 1:100 比例显示，尺寸单位 mm
- 从左侧家具库拖入 60 余种家具家电（卧室、客厅、餐厨、卫浴、家电、书房休闲）
- 拖动移动、旋转（Shift 自由角度）、调整尺寸，贴墙自动吸附
- 测量工具（靠近墙面自动吸附，Shift 锁定水平 / 垂直）
- 内墙虚拟拆改草案；不将未知墙体判定为可拆非承重墙，外墙及烟道保留
- 图层开关：尺寸标注、房间名、家具、网格、墙体状态

**3D 场景**
- 鸟瞰、斜视、俯视多种视角，点击房间列表可飞到对应房间
- 漫游模式：桌面端 WASD + 鼠标，触屏设备用虚拟摇杆，可以点门开关
- 全高墙 / 剖切墙切换，日照时间滑块，夜景灯光
- 精细家具模型：柜门分缝与拉手、软包床头、带环境反射的金属与陶瓷材质等
- 在 3D 中也能选中、拖动家具，与 2D 方案实时同步

**方案与统计**
- 房间与模型面积自动统计
- 为每个房间更换地面材料（木地板、地砖、大理石、水磨石、地毯等），按面积加 5% 损耗估算造价
- 撤销 / 重做，方案自动保存在浏览器本地
- 中文 / English 界面切换（顶栏右侧按钮，默认中文，选择会记住）
- 导出 PNG 图片，导出 / 导入方案 JSON

## 快速开始

```bash
git clone https://github.com/itwake/floorplan.git
cd floorplan
```

建议起一个本地静态服务器（3D 使用 ES Modules）：

```bash
python3 -m http.server 8000
# 访问 http://localhost:8000
```

> Three.js r160 与所需插件随网站本地部署，不依赖外部 CDN。来源与许可证见 `vendor/three/`。

## 快捷键

| 按键 | 作用 |
| --- | --- |
| `T` | 切换 2D / 3D |
| `V` / `M` / `X` | 选择 / 测量 / 拆改墙体 |
| `R` / `Shift+R` | 选中家具顺时针 / 逆时针旋转 90° |
| `Delete` / `Backspace` | 删除选中家具 |
| `Ctrl/⌘ + D` | 复制选中家具 |
| `Ctrl/⌘ + Z`，`Ctrl/⌘ + Shift + Z` | 撤销，重做 |
| `F` | 适应窗口 |
| `+` / `-` | 放大 / 缩小 |
| `[` / `]` | 展开 / 收起左侧家具库、右侧面板 |
| `Shift + F` | 全屏 |
| `Esc` | 取消当前操作 |
| 漫游：`WASD` / 方向键，`Shift`，`E` | 移动，快走，开关门 |

## 技术栈

- 原生 HTML / CSS / JavaScript，无框架、无构建步骤
- 2D 平面图用 SVG 绘制
- 3D 场景用 [Three.js](https://threejs.org/) r160（OrbitControls、PointerLockControls、RoundedBoxGeometry、RoomEnvironment、CSS2DRenderer）
- 数据保存在 `localStorage`

## 自定义户型

户型数据位于 `data/house-plans.js`，由 `tools/convert-house-plans.cjs` 从三套 `data/source/*.json` 快照生成。来源提交和待核项保存在数据中。详见 [导入数据说明](data/README.md)。

- `ROOMS`：房间多边形、名称、默认地面材料
- `WALLS` / `WINS`：墙体与窗洞
- `MATS`：地面材料名称与单价
- `LIB`：家具库（类型、名称、默认尺寸、颜色）
- `buildFurniture()`：各类家具的 3D 模型

已有快照重新生成：`node tools/convert-house-plans.cjs`。

更新 house-design 快照：`node tools/convert-house-plans.cjs --source <原项目目录> --refresh-sources`。

验证几何与脚本：`node tests/validate-import.cjs`。浏览器测试：先开启 4190 端口静态服务器，再运行 `node tests/integration.cjs`（需 Playwright；支持 `FLOORPLAN_NODE_MODULES`、`FLOORPLAN_CHROME`、`FLOORPLAN_BASE_URL` 环境变量）。

发布后运行 `node tests/verify-published.cjs`，逐项检查线上 HTML、户型数据和 3D 模块与当前提交的 SHA-256 完全一致。

GitHub Pages 发布 `master` 分支根目录。原编辑器 MIT 许可与作者署名保留。

## 社交媒体

- X（Twitter）：[@akokoi1](https://x.com/akokoi1)

## 许可协议

[MIT](LICENSE)
