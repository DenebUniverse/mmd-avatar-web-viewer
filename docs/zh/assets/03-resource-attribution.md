# 资源来源与授权边界

本项目当前资源仅用于本地建模学习、MMD/PMX/VMD/VPD 前端加载实验和非商用预览。

## 1. PMX/PMD 模型

| 角色 | 当前路径 | 说明 |
|---|---|---|
| 绯英 | `assets/models/hiying_pmx/星穹铁道—绯英2.pmx` | 默认角色；miHoYo / HoYoverse MMD 模型资源，用于本地非商用二创预览。 |
| 千冶·刃（含环） | `assets/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx` | 用户上传新增角色包。 |
| 千冶·刃附件 | `assets/models/qianye_blade_pmx/剑.pmx`、`assets/models/qianye_blade_pmx/環.pmx` | 保留为附件模型，不作为角色列表主模型。 |

PMX 参考入口：

- Honkai: Star Rail MMD Model list: https://www.hoyolab.com/article/18038802
- Biligame MMD Models Updated: https://www.hoyolab.com/article/118389
- Zenless Zone Zero MMD Character Model Direct Downloads: https://www.hoyolab.com/article/31703413

千冶·刃包内使用规则摘要：

- 允许改造、优化骨骼和刚体、重制 UV；
- 请勿二次配布；
- 请勿用于 18 禁、极端宗教宣传、血腥恐怖猎奇、人身攻击等作品；
- 请勿用于商业用途；
- 模型版权所属 miHoYo。

## 2. VMD/VPD 分类

```text
assets/motions/generated/          项目自带基础 VMD
assets/motions/external/           用户提供或第三方下载动作
assets/motions/external/breath_original/  用户上传的原始呼吸包
assets/poses/generated/            项目自带 VPD
```

## 3. 已内置动作

| ID | 当前路径 | 来源 | 说明 |
|---|---|---|---|
| `breath` | `assets/motions/generated/breath_hiying_compatible.vmd` | 用户上传呼吸包意图适配 | 标准骨骼兼容呼吸/眨眼循环。 |
| `idle` | `assets/motions/generated/builtin_idle.vmd` | 项目生成 | Idle。 |
| `wave` | `assets/motions/generated/builtin_wave.vmd` | 项目生成 | 挥手。 |
| `jump` | `assets/motions/generated/builtin_jump.vmd` | 项目生成 | 跳。 |
| `peek` | `assets/motions/generated/builtin_peek.vmd` | 项目生成 | 凑近看。 |
| `shotenTime` | `assets/motions/external/shoten_time_mihoyo_yujie.vmd` | https://www.aplaybox.com/details/motion/R6gbFldDGAlL | 昇天time；使用时按作者 README 署名。 |
| `goodTea` | `assets/motions/external/good_tea_shake_mihoyo_yujie.vmd` | https://www.aplaybox.com/details/motion/0E1Ex3coeccA | 来杯好茶摇一摇。 |
| `lovermaxHipSway` | `assets/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd` | https://bowlroll.net/file/309048 | TikTok 風腰振りダンス / lovemax；米哈游角色兼容版。 |
| `eyedartBreath` | `assets/motions/external/eyedart_breath.vmd` | https://bowlroll.net/file/231043 | 可选资源；当前缺文件时由 registry 标记为 `optionalMissing`。 |

## 4. 第三方动作边界

`昇天time` 包内 README 摘要：

- 发布作品时在借物表注明动作作者 `DokiDoki`；
- 禁止直接或间接贩卖、出租动作数据文件；
- 允许根据模型或镜头需要修正动作；
- 允许发布使用本动作或修改后动作的衍生视频作品。

`来杯好茶摇一摇` 包内 README 为空，因此项目只记录用户提供的 Aplaybox 来源链接和本地文件映射。

`TikTok 風腰振りダンス` README 摘要：

- 作者 `lovemax`；
- 内容物为 `dance.vmd`；
- 需要準標準ボーン，例如グルーブ、腰、上半身2、腕捩、手捩；
- 使用该文件制作/公开视频或静画需由使用者自行负责；
- 动作数据本体禁止再分发；
- 信用标注非必需但建议标注。

项目保留原始 VMD 和 README，并注册一个移除绯英/千冶·刃缺失关键帧的兼容版。

## 5. 禁止事项

- 不绕过作者下载限制；
- 不猜测下载密钥；
- 不修改第三方资源的利用规约；
- 不把没有明确授权的资源当作可商用素材；
- 不因为使用 Git LFS 或本地部署就忽略再分发授权。
