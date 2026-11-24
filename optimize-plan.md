# OPTIMIZE-PLAN.md · 精品垃圾质量优化循环协议

> 目标:全系列每件藏品的交互内容达到「10 次点击之内不重样」。
> 用户指令(2026-11-23):一次修复 10 个,分 5 个子代理,每 20 分钟一批,不说停就一直优化。

## 达标标准(按交互类型)

| 类型 | 数据键 | 达标线 | 现状(2026-11-23 普查) |
|---|---|---|---|
| counter(按钮计数) | 每个按钮 `lines` | **每按钮 ≥8 条** | 251 页不达标(多为 3 条/按钮) |
| meter(仪表检测) | `reasons` | **≥8 条** | 62 页不达标 |
| queue(排队叫号) | `takeLines` + `scenes` | **各 ≥8 条** | 34 页不达标 |
| slots(随机抽取) | `pools` | **≥12 条** | 达标为主,复查 |
| generator(生成器) | `presets` + `notes` | **各 ≥5 条** | 达标为主,复查 |
| detector(样本检测) | `samples` | **≥6 个样本** | 52 页不达标 |

手工时代 32 页(1-32 号,无标准数据块)单独立项,不在本循环内。

## 每轮流程(20 分钟一批)

1. **取件**:从 `optimize-worklist.json` 按 deficit 降序取前 10 件(deficit>0)。
2. **分派**:5 个子代理并行,每代理 2 件。子代理**只编辑指定 html 的 `var D={...}` JSON 数据块**,禁碰 factory/git/其他文件。
3. **丰富规则**:
   - 保留原数组全部条目在头部,按原顺序追加新条目至达标线;
   - 新文案与该藏品主题强相关,延续「公文冷幽默」语气,中文,单条 30-60 字;
   - 严禁与其他藏品概念重复;严禁内嵌英文双引号(用「」);JSON 不得有尾逗号;
   - detector 追加 samples 时同步在按钮区加对应 `data-sample` 按钮。
4. **收口(协调员)**:提取每页 D 块 JSON.parse 验证 → `node audit.js` 全绿 → git add 本轮 10 件 + worklist → UTF-8 commit(`quality: 优化第 N 轮 10 件(...)` )→ push → Pages built 验证 → 更新 worklist(把完成件 deficit 归零/移出队列)→ memory 记录。
5. **循环**:直到 worklist 清空或用户叫停。

## 进度记录

- 每轮完成后在本文件「轮次日志」追加一行:轮次 / 10 件文件名 / commit / 结果。

## 轮次日志

- **第 1 轮(2026-11-23 22:35)**:B/C/D/E 四路子代理交付 8 件,address/alarm/baiban/baoxianhe/bianlitie/bushu/bx2/cahong,全部 lines 3→8(每按钮)、JSON 自检通过、runtime 扫描 0 问题。A 路(nianling/pingxing)未交付,顺延至下一轮队首。协调员收口提交。
