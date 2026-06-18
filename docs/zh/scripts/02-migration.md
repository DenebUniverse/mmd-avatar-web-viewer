# scripts 迁移说明

## 原则

- 先保留旧脚本作为回归门禁；
- 新模块测试稳定后再逐项替代；
- 不在目录移动同时重写检测逻辑；
- Release 构建与开发构建分开。

## 顺序

1. `auto_check_all.sh` 继续作为总入口；
2. 增加 workspace lint/typecheck/test；
3. Asset Registry 测试替代旧 manifest 检查；
4. Stage tests 替代源码字符串检查；
5. Web component/E2E 替代 DOM 静态检查；
6. 最后移除一次性兼容脚本。
