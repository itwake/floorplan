# 我们的户型数据

`house-plans.js` 由 `tools/convert-house-plans.cjs` 生成，网页通过 `window.HOUSE_PLANS` 读取，Node 可通过 `require` 读取。默认是当前方案二「木光 · 亲子储物」`family`，其余两套是「木光原境」`wood` 与「木光 · 家政整墙」`laundry`。展示名称不含方案序号，序号由界面统一添加。

## 来源与精度

`source/*.json` 是原 `itwake/house-design` 当前设计数据中绘图所需字段的快照。每套都保存源提交、原文件路径、SHA-256 和原查看器版本 3.13.3。生成过程不改原仓库。

源坐标单位为 cm，统一乘 10 得到 mm。家具源 `x,y,w,d` 是沿全局东西、南北轴的包围盒；编辑器的 `cx,cy,w,d,rot` 为局部中心坐标。床头及家具朝向转换后仍保留原全局占地。已购 IKEA VIMLE、LISABO 桌椅宽、深、高逐件与产品记录核对，不进行缩放。

户型总轮廓、统一墙厚和部分净尺寸仍有未闭合处。`metadata.measurements.applied` 保存已应用的部分复尺，`pending` 保存待核项；门洞尺寸仍是拟建方案，不混同现状门扇记录。`WALL_META` 不将未知墙线认定为可拆非承重墙。厨房不可利用烟道单独作为固定服务墙体保存。

## 渲染接口

- `ROOMS`: 毫米多边形 `poly`、房间标签 `at`、地面材质、分区 `heightMm`。飘窗额外区域 `counted:false`，不重复计入室内面积。
- `WALLS`: `[x0,y0,x1,y1,kind]` 矩形，窗与门洞已从全高墙段切除；`WALL_META` 同索引保存墙高、来源与待核状态。
- `WINS` / `WIN_META`: 同索引的矩形和窗高、窗台、来源。`bay-aperture` 是原墙上洞口，`noGlass/noFrame`；`bay-front` 是外凸窗前玻璃。两面生活阳台为 `guarded-open-air`，`noGlass:true`、`guard:true`，保留下矮墙与上梁。
- `DOORS`: 原生 `rect,h,c,o,len`。`len` 是门叶长度，`openingWidthMm` 是洞口宽，例如方案二 900 mm 洞口与 780 mm 示意门叶分别保存。`defaultOpen` 和 `directionStatus` 区分已设计开启与原先关闭示意。门的源操作参数一并保存。
- `SLIDES`: `rect,v,panelCount,trackCount,stackTo`，墙外挂单扇推拉门另有 `surface,panelRect,parkedRect`。
- `BAYS`: 原洞口、前窗、侧返墙 `sideRects`、`poly`、台高、板厚以及外凸尺寸。外凸从墙外侧到前窗中心，原墙洞没有额外平窗玻璃。
- `BIFOLDS`: 800 库独立四扇折叠门 `rect,axis,panels,heightMm,elevationMm,closed`，默认闭合；柜体组不再重复生成叠停门扇。
- `defaultFurniture`: 原生家具与 `type:'fixture'` 定制组。定制组 `parts` 的 `x,y` 是相对于家具 `cx,cy` 的左上角，宽、深和离地高度均为 mm；组初始 `rot:0`，缩放基准为 `baseWidthMm/baseDepthMm`。台面开槽按源切口拆分为数个板块，洗烘上方浅盆用空腔板件表示。
- `BOUNDS` / `PLAN_BOUNDS` / `CENTER`: 随实际方案与外凸飘窗自动计算，用于适应画布、相机及尺寸链。

## 定制柜功能细化层

`tools/cabinet-designs.cjs` 在原几何导入后应用业主 2026-10-08 提供参考的便捷分区：奶白柜门、浅原木背板和台面、薄板柜壳、中空操作台、内嵌灯带、浅抽和常鞋位。所有原家具 ID、中心、宽深高、旋转、房间墙洞及 800 库四扇北开口折叠门保持不变，原 `source/*.json` 不被改写。

细化物件附 `cabinetRevision`、`cabinetDesign`（功能、暂定分区尺寸、立面方向、概念状态）与 `baseHeightMm`。衣柜沿用原局部尺寸和旋转转成 `fixture`，电视柜仍是带板件的 `tvstand` 以保留柜上电视。部件 `face` 是组内坐标下的柜面，板厚暂取18mm、门缝3mm；五金、净深、承重、安装及电气配置均须深化，不能直接下单。

升级同 ID 旧浏览器草稿时只换部件和功能资料，保留用户摆位、尺寸、高度、名字与自定义颜色；原默认柜色才跟随新配色。删除和复制物件不被恢复或改写。改变尺寸后，立面按外包比例示意，分区尺寸须重新审核。

## 重新生成

已有快照可直接执行：

```sh
node tools/convert-house-plans.cjs
```

更新原仓库快照时执行：

```sh
node tools/convert-house-plans.cjs --source "C:/Users/dvnuo/Documents/其它/house-design" --refresh-sources
```

转换器同时验证房间面积、逐件家具世界占地、已购产品三维尺寸、门叶方向与门洞差异、窗洞墙体切空、三个飘窗外凸，以及方案二四扇默认关闭库门。

网页所需 Three.js r160 与 5 个 addons 同时保存在 `vendor/three/`，以同站点相对路径加载。来源为官方 `three@0.160.0` npm 包，原 MIT 许可和逐文件 SHA-256 清单均保留；无需在网页运行时访问第三方 CDN。
