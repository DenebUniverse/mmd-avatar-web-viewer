# assets 迁移说明

## 当前来源

```text
public/models/
public/motions/
public/poses/
```

## 顺序

1. 先建立 `assets/` 目录和 Server URL 映射；
2. Character config 继续引用旧 URL；
3. 复制或移动一个测试角色验证映射；
4. 全部资产迁移；
5. 扫描器改扫 `assets/`；
6. 删除 `public/` 大资源；
7. Release 构建按需复制进 dist。

## 验收

- 主分支不同时保存 `public` 和 `dist` 两份资源；
- 删除 `dist/` 后可重新构建；
- Server 模式下 `dist` 可共享 `assets`；
- 资源 URL 中的中文文件名可正确编码和加载。
