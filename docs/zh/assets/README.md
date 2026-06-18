# assets

对应目标代码目录：`assets/`。

## 资产真源

```text
assets/
  models/
  motions/
  poses/
  stages/
  audio/
```

Character Package 只引用资产，不复制资产。`public/` 和 `dist/` 不再作为长期二进制真源。

## URL 映射

```text
磁盘：assets/models/hiying/model.pmx
URL： /assets/models/hiying/model.pmx
```

由 Server/static middleware 或开发代理映射。

## Git 与授权

第三方模型和动作是否提交，取决于再分发授权。不可再分发资源应通过下载脚本或用户本地放置，不应因为使用 Git LFS 就忽略授权问题。

当前资源来源和授权边界见 [资源来源与授权边界](./03-resource-attribution.md)。
