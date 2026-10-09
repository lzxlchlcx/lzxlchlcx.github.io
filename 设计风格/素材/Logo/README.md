# 莲子心 Logo 素材

品牌图形源文件、不同背景版本、网站图标和同步脚本集中保存在此目录。

## 文件与用途

| 文件 | 用途 |
|---|---|
| [莲子心-logo.svg](莲子心-logo.svg) | 深色背景使用的默认 Logo |
| [莲子心-logo-浅色背景.svg](莲子心-logo-浅色背景.svg) | 浅色背景使用的 Logo |
| [莲子心-logo-单色.svg](莲子心-logo-单色.svg) | 单色印刷与不适合彩色的场景 |
| [莲子心-favicon.svg](莲子心-favicon.svg) | 网站浏览器图标 |
| [sync_brand_assets.py](sync_brand_assets.py) | 同步默认 Logo 与 favicon 到网页部署目录 |

图形组合、配色、最小尺寸和留白见 [设计规范](../../Material_Design/Material_Design_设计方案.md) 的「6.4 莲子心品牌标识」。

## 同步网页素材

修改源文件后，在仓库根目录运行：

```sh
python3 设计风格/素材/Logo/sync_brand_assets.py
python3 设计风格/素材/Logo/sync_brand_assets.py --check
```

第一条命令复制并更新部署文件；第二条只检查一致性。

| 源文件 | 网页部署副本 |
|---|---|
| `莲子心-logo.svg` | `docs/assets/brand/lianzixin-logo.svg` |
| `莲子心-favicon.svg` | `docs/assets/brand/lianzixin-favicon.svg` |

浅色背景与单色版本保留在本目录供其他项目复用，当前同步脚本只管理上述两份网页部署素材。
