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

升级同 ID 旧浏览器草稿时换部件和功能资料，保留用户摆位、自定义尺寸/高度、名字与自定义颜色；原默认柜色才跟随新配色。删除和复制物件不被恢复或改写。改变尺寸后，立面按外包比例示意，分区尺寸须重新审核。

### 三套通顶餐边柜参考层

`tools/sideboard-reference.cjs` 在上述功能层之后应用 `sideboard-reference-v2`，仅替换三套 `fit-dining_sideboard_wall` 的内部板件、立面及默认高度。平面中心、宽深、旋转和各段原占地不变，方案1/3的7字返柜与400mm盲角保留，方案2不增加返柜或遮挡800库北开口。直柜正面左为南、右为北，SVG与3D方向一致。

奶白通顶柜、原木上柜门、两层开放书格、850mm台面、650mm高中空、三圆插座轨道、三抽列、五格展示列及R60中空圆弧收口对应用户新参考。三抽列按实有座位调序至北段：方案2外宽400mm，方案1/3外宽600mm，示意最大拉出250mm。原餐桌接触段保留滑门。200mm窄高柜不作为大件储物，圆弧饰面与封闭盲角不虚计容量。

高2700mm仅贴合当前模型屋顶，现场层高/吊顶/找平待核。旧草稿原默认2500mm餐边柜自动升级2700mm，自定义柜高不覆盖。`previousColors`、`previousHeightMm` 只用于同ID外观迁移，不修改草稿key或源SHA。`shape:rounded-shell` 用18mm薄壁圆角空壳，`rounded-plan-board` 为独立18mm顶底；`led-strip.anchorPartId` 指向实际板件，其上沿贴板底。主中空连续灯带用两盏朝下的真实暖光洗墙灯，展示格用发光条与透明背面光晕表现，不将每一条灯带都转成场景光源。

## 后续门向修订

2026-10-08 按业主要求，方案2/3的主卫门改为南侧合页、向主卫内开，以避开北侧洗手台。门洞仍750mm、门扇630mm，位置/宽高和所有家具不变；方案1不改。转换器 `correctMasterBathSwing()` 保留原快照，输出带 `swingRevision` 与 `metadata.designCorrections` 的明确后续修订。原源数据的门向不再代表这两扇门的最终设计。门向不储存在浏览器草稿中，因此不需重置草稿；门套、五金与现场净空仍待深化。

## 方案1公共区后续修订

2026-10-09 的 `tools/wood-public-area.cjs` 在三套方案转换完成后，仅对 `wood` 应用业主的新布局：复制方案2的800库、北向四扇折门和贴柜餐桌椅，西墙餐柜改为同款直柜取消南返段；电视/沙发/茶几/地毯共同对齐模型电视墙中心5485mm。背柜沿用方案2三滑门设计，宽微调至1900mm避开阳台门框，以同一个柜体生成器重新构建18mm薄板，不缩小板厚。其他两套完整数据、所有墙洞和卧室厨卫保持原样。

`metadata.layoutUpdate` 记录修订、旧物件快照、新增ID和几何条件。保留源快照不改；已移动物件的原包围盒另存 `originalSourceFootprintMm`，`sourceFootprintMm` 更新为当前摆位占地。旧草稿按字段只替换未自行编辑的旧默认值，新增物件插入一次并保存修订标记；删除不复活。自定义保留项提示动线可能与新默认不同。修订不更换原浏览器key或源SHA。

库门向内折的前365mm空区保留，两车分层和横抽不足的限制仍明确；背柜端部到阳台门框的27.5mm只是示意边界间隙，不是可用通路。旧墙端点、净轮廓与完成面差异仍待实测。模型静态避碰和净距测试不代表施工、承重及实际取车可行性批准。

`tests/wood-public-area-helpers.cjs` 用修订前提交74243b6的固定全方案哈希验证历史快照，其他回归只归一化明确授权的公共区层，不以新数据替换旧基线。

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
