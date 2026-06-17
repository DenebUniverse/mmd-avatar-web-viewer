# 03 本地运行与 OBS 部署

## 本地运行

```bash
npm install --registry=https://registry.npmmirror.com
npm run dev
```

`npm run dev` 会自动扫描 `public/models`、`public/motions`、`public/poses`，并生成 `public/resource_manifest.json`。

访问默认绯英：

```text
http://127.0.0.1:5173/
```

访问千冶·刃：

```text
http://127.0.0.1:5173/?character=qianyeBlade
```

直接加载本地新增模型：

```text
http://127.0.0.1:5173/?model=/models/local/my_character/my_character.pmx
```

## 添加新资源

推荐目录：

```text
public/models/local/my_character/xxx.pmx
public/motions/local/xxx.vmd
public/poses/local/xxx.vpd
```

放入后重启：

```bash
npm run dev
```

前端下拉列表会显示新资源。若要稳定 ID、中文名、来源链接和授权备注，请补充：

```text
public/models/avatar_manifest.json
public/motions/vmd_manifest.json
```

## dist 静态预览

如需直接服务 `dist/`：

```bash
npm run sync-dist
npm run serve:dist
```

如果把资源直接下载进 `dist/models`、`dist/motions`、`dist/poses`，重新运行：

```bash
npm run serve:dist
```

会扫描 `dist/` 并生成 `dist/resource_manifest.json`。

## OBS

Browser Source：

```text
http://127.0.0.1:5173/?obs=1&character=hiying
```

半身：

```text
http://127.0.0.1:5173/?obs=1&character=hiying&framing=bust
http://127.0.0.1:5173/?obs=1&character=qianyeBlade&framing=bust
```

播放动作：

```text
http://127.0.0.1:5173/?obs=1&character=hiying&motion=shotenTime&face=vmd&lip=vmd
http://127.0.0.1:5173/?obs=1&character=qianyeBlade&motion=lovermaxHipSway&face=vmd&lip=vmd
```
