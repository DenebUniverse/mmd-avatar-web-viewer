# tests

对应目标代码目录：`tests/`。

## 分层

```text
unit/       Core、Config、Registry、Controllers
contract/   Protocol schema、Adapter contract
integration Server + Store + Mock Provider
assets/     PMX/VMD/VPD fixture 与兼容性
web/        component tests
e2e/        完整浏览器流程
release/    dist/asset artifact
```

## 必要门禁

- Config secret redaction；
- Character public/private DTO 边界；
- Actor/Session 懒绑定；
- Protocol schema；
- Stage 角色/动作/姿态回归；
- Agent streaming 与取消；
- Browser TTS 降级；
- 构建后无 secret。
