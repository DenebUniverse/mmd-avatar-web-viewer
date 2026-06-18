# characters

对应目标代码目录：`characters/`。

该目录保存角色人格和资源引用，不保存重复的 PMX/VMD 二进制副本。

```text
characters/
  hiying/
    character.yaml
    Soul.md
    skills/
    memory/
  qianye-blade/
    character.yaml
    Soul.md
```

## 规则

- `character.yaml` 是角色入口；
- 模型 URL 指向 `/assets/models/...`；
- `Soul.md` 只由 Server 读取；
- 运行时聊天记录不写回角色包；
- 角色包可以缺少 Soul，此时仍可作为纯舞台角色；
- 角色授权和来源应在 metadata 或独立 LICENSE/ATTRIBUTION 记录。

## 与 `packages/characters` 的区别

- `characters/`：数据；
- `packages/characters/`：加载、校验和 Registry 代码。
