# 托举人物素材

透明背景的匿名探索者人物，保留空白手心，用于与独立球体素材组合。

## 文件与用途

| 文件 | 用途 |
|---|---|
| [guardian-gloved.png](guardian-gloved.png) | 1312 × 1199 戴手套人物透明原图 |
| [guardian-gloved.webp](guardian-gloved.webp) | 主页使用的人物压缩图 |
| [guardian.png](guardian.png) | 手套替换前的透明原图，可继续用于图像编辑 |
| [人物素材提示词.md](人物素材提示词.md) | 人物编辑参数与原始提示词 |
| [sync_assets.py](sync_assets.py) | 将人物素材同步到主页部署目录 |

人物手势、手心位置和透明背景应在修改时保持一致；通过页面布局决定球体的悬浮位置与尺寸。球体渲染器、预览和设计经验见 [交互球体目录](../交互球体/README.md)。

## 同步主页人物素材

本目录是人物素材的编辑入口，主页部署副本保存在 `docs/assets/`。修改后，在仓库根目录执行：

```sh
python3 设计风格/素材/托举人物/sync_assets.py
python3 设计风格/素材/托举人物/sync_assets.py --check
```

同步范围为 `guardian.png`、`guardian-gloved.png` 和 `guardian-gloved.webp`；`--check` 只检查源文件与部署副本是否一致。同步脚本用于本仓库目录布局。
