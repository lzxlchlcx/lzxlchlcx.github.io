# 个人宇宙主页素材

主页位于 `../index.html`，无构建步骤、无第三方脚本依赖。通过现有静态站点服务即可预览。

## 文案与链接

- 姓名、简介、文章、兴趣与经历在 `../index.html` 中编辑。
- 博客的真实阅读链接为 `../visual-reading/自然辩证法.html`。
- 兴趣 `01`：编程与 AI，链接为 `https://github.com/lzxlchlcx?tab=repositories`。
- 兴趣 `02`：个人知识管理，链接为已有自然辩证法复习手册。
- 兴趣 `03`：视觉与设计，暂用 `https://m3.material.io/` 官方设计指南，可替换为个人作品页面。
- 更改某项兴趣链接时，同时修改左侧 `data-interest` 入口与右侧同名 `data-interest-visual` 图片入口。
- 时间轴仅保留原主页提供的经历，没有新增学校、雇主、职位。新增节点时保持时间点按钮与气泡 `aria-controls` / `id` 对应。

## 图片

| 网页使用素材 | 用途 | 可编辑原图 / 兼容素材 |
| --- | --- | --- |
| `guardian-gloved.webp` | 首屏戴手套人物；1312 × 1199，真实透明背景 | `guardian-gloved.png`；旧版本为 `guardian.png` |
| `about-art.webp` | 星空书房与匿名探索者的概念插画 | `about-art.png`；加载失败回退 `about.svg` |
| `interest-code.webp` | 编程与 AI 场景 | `interest-code.png`；回退 `interests.svg` |
| `interest-notes.webp` | 笔记与知识星图场景 | `interest-notes.png`；回退 `writing.svg` |
| `interest-design.webp` | 视觉设计工作室 | `interest-design.png`；回退 `interests.svg` |
| `writing.svg` | 现有复习手册主题封面 | 可直接编辑 SVG |
| `journey.svg` | 学习历程发光路径插画 | 可直接编辑 SVG |

四张内容插画原图均为 1190 × 1322。页面使用 WebP 压缩版本，PNG 原图保留供后续替换。关于我插画是匿名概念场景，个人照片仍明确标注待补充。

人物与手部复用同一透明图，通过柔和遮罩分层，保证托举姿态对齐。球体独立绘制，不在人物素材内。

这些位图使用内置 ImageGen 工具生成或编辑，未使用 CLI。完整最终提示词见 [image-prompts.md](image-prompts.md)。

## 交互与动画

- `orb.js`：独立 Canvas 球体；94 个大小不同的弧形孔洞、深色金属骨架、彩色透光膜、尖刺与边缘光。非匀速多轴旋转、扭曲、起伏及收缩；低性能设备使用 70 个孔洞。
- `atmosphere.js`：共享星空；缓存噪声星云、缓慢流动的极光、深度星粒、柔和星芒、漂浮星尘与间歇流星。流星约每 22 秒出现一次，低性能或减少动态时停用。
- `home.js`：视差、球体导航、分页、780 毫秒屏幕切换、长内容正常滚动、兴趣切图与时间轴气泡。
- `home.css`：布局与氛围。`--orb-size`、`--orb-y` 控制球体；`.figure-layer` / `.hand-layer` 控制人物位置。
- 兴趣列表悬停、键盘聚焦或方向键切换配图；点击列表或当前配图跳转。手机提供独立切图按钮。
- 横向时间轴悬停、聚焦或点击时间点显示气泡；左右键 / Home / End 切换，Esc 收起。气泡保持显示，内部链接可以点击。
- 系统减少动态时停止持续动画、视差与平滑切换；低性能设备降低粒子数量、像素比和帧率；离开首屏或隐藏页面时暂停相应绘制。
