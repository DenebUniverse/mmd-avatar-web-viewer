# mmd-avatar-web-viewer

`mmd-avatar-web-viewer` 是一个面向本地直播 / OBS / MMD 资源预览的 Web 数字人查看器。当前运行架构统一为：

```text
PMX / PMD 模型 + VMD 动作 + VPD 姿态 + three.js MMDLoader + MMDAnimationHelper
```

前端负责加载角色模型、动作和姿态；动作统一由 VMD/VPD 资源驱动，不再维护运行时手写骨骼动作分支。

## 重要用途声明

本项目仅供建模学习、MMD/PMX/VMD/VPD 前端加载实验和本地非商用预览使用。

请勿用于18禁作品，极端宗教宣传，血腥恐怖猎奇作品，人身攻击等

请勿用于商业用途

他人使用本模型所造成的一切不良后果，不由模型改造者与miHoYo承担，请向使用者追究全部责任

模型版权所属miHoYo

第三方 VMD / VPD / Camera / Stage / MME 等素材需遵守原作者页面和包内 README。部分动作禁止再分发；本地测试包仅用于私下学习验证，公开发布项目或仓库前请删除未获再分发授权的第三方动作文件。

## 快速启动

```bash
npm install --registry=https://registry.npmmirror.com
npm run dev
```

`npm run dev` 会先自动执行：

```bash
python3 scripts/scan_public_assets.py
```

它会扫描：

```text
public/models/**/*.pmx|*.pmd
public/motions/**/*.vmd
public/poses/**/*.vpd
```

并生成：

```text
public/resource_manifest.json
```

前端会读取这个资源索引，自动填充角色、动作和姿态下拉列表。

打开：

```text
http://127.0.0.1:5173/
```

OBS Browser Source：

```text
http://127.0.0.1:5173/?obs=1&character=hiying
```

## 资源自动扫描规则

### 推荐目录

```text
public/
  models/
    my_character/
      character.pmx
      textures...
  motions/
    local/
      dance.vmd
  poses/
    local/
      pose.vpd
```

把模型、动作、姿态下载到这些目录后，重启服务即可自动加载：

```bash
npm run dev
```

### manifest 显示优先级

项目仍保留人工维护的 manifest：

```text
public/models/avatar_manifest.json
public/motions/vmd_manifest.json
```

显示规则：

```text
1. manifest 中声明的资源优先使用 manifest 里的 id、label、source、说明。
2. manifest 没写、但扫描到格式合法的 PMX/PMD/VMD/VPD，也会自动进入前端列表。
3. 额外扫描资源的名称默认来自文件名，并标记为“扫描”。
4. 角色默认仍是 hiying / 绯英。
```

如果只是临时测试，不需要改代码；如果要给资源取稳定 ID、中文显示名、来源链接和授权说明，再补到 manifest。

### dist 静态预览

如果你使用 `dist/` 静态目录，也可以把资源直接放进：

```text
dist/models
dist/motions
dist/poses
```

然后运行：

```bash
npm run serve:dist
```

这个命令会先扫描 `dist/` 并生成：

```text
dist/resource_manifest.json
```

再启动静态服务。

## URL 参数

```text
?character=hiying                         绯英
?character=qianyeBlade                    千冶·刃（含环）
?model=/models/local/xxx.pmx              直接加载自定义 PMX/PMD
?motion=breath                            默认兼容呼吸
?motion=idle                              Idle
?motion=wave                              挥手
?motion=jump                              跳
?motion=peek                              凑近看
?motion=shotenTime&face=vmd&lip=vmd       昇天time
?motion=goodTea&face=vmd&lip=vmd          好茶摇一摇
?motion=lovermaxHipSway&face=vmd&lip=vmd  lovermax TikTok風腰振りダンス
?vmd=/motions/local/xxx.vmd               直接加载自定义 VMD
?framing=bust                             半身镜头
?obs=1                                    OBS 透明控制台模式
```

## 当前内置角色

```text
hiying       -> 绯英，默认角色
qianyeBlade  -> 千冶·刃（含环）
```

前端控制台支持角色下拉切换。额外放入 `public/models` 的有效 PMX/PMD 会自动进入角色列表。

## 当前内置动作

```text
public/motions/generated/breath_hiying_compatible.vmd
public/motions/generated/builtin_idle.vmd
public/motions/generated/builtin_wave.vmd
public/motions/generated/builtin_jump.vmd
public/motions/generated/builtin_peek.vmd
public/motions/external/shoten_time_mihoyo_yujie.vmd
public/motions/external/good_tea_shake_mihoyo_yujie.vmd
public/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd
```

额外放入 `public/motions` 的合法 VMD 会自动进入动作下拉列表。

## 素材来源与使用边界摘要

| 类型 | 素材 | 来源/作者 | 本地路径 | 备注 |
|---|---|---|---|---|
| PMX | 绯英 | miHoYo / HoYoverse MMD 模型资源 | `public/models/hiying_pmx/星穹铁道—绯英2.pmx` | 默认角色，仅供本地非商用学习预览。 |
| PMX | 千冶·刃（含环） | 崩坏：星穹铁道 / miHoYo | `public/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx` | 用户上传新增角色包。 |
| VMD | 昇天time ⋆⁺₊（mihoyo御姐体型） | Aplaybox / DokiDoki | `public/motions/external/shoten_time_mihoyo_yujie.vmd` | 使用时按作者 README 署名。 |
| VMD | 来杯好茶摇一摇（mihoyo御姐体型） | Aplaybox / DokiDoki | `public/motions/external/good_tea_shake_mihoyo_yujie.vmd` | 用户上传动作包。 |
| VMD | TikTok風腰振りダンス | BowlRoll / lovemax | `public/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd` | 原动作禁止动作数据本体再分发；公开发布前请移除或自行确认授权。 |
| VMD | 呼吸モーション | 用户上传呼吸包 | `public/motions/generated/breath_hiying_compatible.vmd` | 已生成标准骨骼兼容呼吸/眨眼循环。 |

完整资源链接、引用和授权边界见：

```text
docs/01_资源清单与授权边界.md
docs/11_VMD资源与接入说明.md
```

## 检查

```bash
npm run check
```

检查覆盖：

```text
资源自动扫描
PMX 资源检查
MMDLoader / MMDAnimationHelper 架构检查
角色/VMD 名称级适配检查
DOM 绑定检查
dist fallback
前端 smoke test
```
