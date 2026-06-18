# scripts

对应目标代码目录：`scripts/`。

脚本只处理扫描、生成、迁移、检查和发布，不承载应用运行时核心逻辑。

目标分类：

```text
scripts/
  assets/
  migration/
  checks/
  release/
```

所有生成文件必须可删除重建，并在文件头或 metadata 中标记 generated。
