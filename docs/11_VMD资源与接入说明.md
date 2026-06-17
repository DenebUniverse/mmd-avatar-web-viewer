# 11 VMD 资源与接入说明

## MMD / PMX 参考入口

- Honkai: Star Rail MMD Model list: https://www.hoyolab.com/article/18038802
- Biligame MMD Models Updated: https://www.hoyolab.com/article/118389
- Zenless Zone Zero MMD Character Model Direct Downloads: https://www.hoyolab.com/article/31703413
- three.js MMDLoader / PMX / VMD / VPD 说明参考: https://forum.babylonjs.com/t/mmd-file-support-similar-or-better-than-the-one-in-threejs/3615
- three-mmd-loader 示例: https://github.com/hanakla/three-mmd-loader

## 当前接入角色

| ID | 本地路径 | 说明 |
|---|---|---|
| `hiying` | `/models/hiying_pmx/星穹铁道—绯英2.pmx` | 默认角色 |
| `qianyeBlade` | `/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx` | 新增角色；包内还保留 `剑.pmx`、`環.pmx` |

## 当前接入动作

| ID | 本地路径 | 来源链接 | 说明 |
|---|---|---|---|
| `breath` | `/motions/generated/breath_hiying_compatible.vmd` | 用户上传呼吸包意图适配 | 标准骨骼兼容呼吸/眨眼循环 |
| `idle` | `/motions/generated/builtin_idle.vmd` | 项目生成 | Idle |
| `wave` | `/motions/generated/builtin_wave.vmd` | 项目生成 | 挥手 |
| `jump` | `/motions/generated/builtin_jump.vmd` | 项目生成 | 跳 |
| `peek` | `/motions/generated/builtin_peek.vmd` | 项目生成 | 凑近看 |
| `shotenTime` | `/motions/external/shoten_time_mihoyo_yujie.vmd` | https://www.aplaybox.com/details/motion/R6gbFldDGAlL | 昇天time ⋆⁺₊（mihoyo御姐体型） |
| `goodTea` | `/motions/external/good_tea_shake_mihoyo_yujie.vmd` | https://www.aplaybox.com/details/motion/0E1Ex3coeccA | 来杯好茶摇一摇（mihoyo御姐体型） |
| `lovermaxHipSway` | `/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd` | https://bowlroll.net/file/309048 | TikTok風腰振りダンス / lovemax；使用米哈游角色兼容版播放 |
| `eyedartBreath` | `/motions/external/eyedart_breath.vmd` | https://bowlroll.net/file/231043 | 可选 Eyedart & Breath Motion，需用户自行下载 |


## 自动接入新资源

无需反复改前端代码。把资源放入对应目录后重启服务：

```text
public/models/**/*.pmx|*.pmd
public/motions/**/*.vmd
public/poses/**/*.vpd
```

运行：

```bash
npm run dev
```

启动前会生成：

```text
public/resource_manifest.json
```

前端会基于该索引动态显示角色、动作和姿态。若资源已经写入 `avatar_manifest.json` 或 `vmd_manifest.json`，使用 manifest 里的中文名、来源链接和授权说明；否则使用文件名显示，并标记为扫描资源。

对于 `dist/` 静态目录，运行：

```bash
npm run serve:dist
```

会扫描 `dist/models`、`dist/motions`、`dist/poses` 并生成 `dist/resource_manifest.json`。

## 用户上传包

```text
昇天time_by_SuperDuper干饭人_64a67d837b5309a70572786ecc4f53b0.zip
└── 昇天time/昇天time.vmd -> public/motions/external/shoten_time_mihoyo_yujie.vmd

爻老板_by_SuperDuper干饭人_e6dcb408455d45effcb07091f5b46fc0.zip
└── 爻老板/yao.vmd -> public/motions/external/good_tea_shake_mihoyo_yujie.vmd

星穹铁道—千冶·刃（含环）_by_崩坏：星穹铁道_2cff0625525bd56c0f9cca3ff4514b45.zip
└── 星穹铁道—千冶·刃2.pmx -> public/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx
└── 剑.pmx / 環.pmx -> public/models/qianye_blade_pmx/

TikTok風腰振りダンス.zip
└── dance.vmd -> public/motions/external/lovermax_tiktok_hip_sway.vmd
└── 米哈游角色兼容版 -> public/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd
└── readme.txt -> public/motions/external/lovermax_tiktok_hip_sway_README.txt
```

`昇天time` README 摘要：发布作品时在借物表注明动作作者 `DokiDoki`；禁止直接或间接贩卖、出租动作数据文件；允许根据模型或镜头需要修正动作；允许发布使用本动作或修改后动作的衍生视频作品。

`爻老板` 包内 README 为空，因此项目只记录用户提供的 Aplaybox 来源链接和本地文件映射。

`TikTok風腰振りダンス` README 摘要：作者 `lovemax`；内容物为 `dance.vmd`；需要準標準ボーン（グルーブ、腰、上半身2、腕捩、手捩必須）；使用该文件制作/公开视频或静画需由使用者自行负责；动作数据本体禁止再分发；信用标注非必需但建议标注。项目保留原始 VMD 和 README，并注册一个移除绯英/千冶·刃缺失关键帧的兼容版。

## 推荐自定义动作目录

```text
public/motions/local/
```

访问：

```text
http://127.0.0.1:5173/?vmd=/motions/local/your_motion.vmd&face=vmd&lip=vmd
```
