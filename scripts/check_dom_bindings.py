#!/usr/bin/env python3
from __future__ import annotations
import pathlib, re, json, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
index = (ROOT / 'index.html').read_text(encoding='utf-8')
main = (ROOT / 'src/main.js').read_text(encoding='utf-8')
ids = set(re.findall(r'id="([^"]+)"', index))
fail = []

# Direct document.querySelector(...).onclick can stop module boot on missing DOM nodes.
if re.search(r"document\.querySelector\('#[^']+'\)\.onclick", main):
    fail.append("direct querySelector(...).onclick binding is forbidden; use bindClick")

# Required bindClick ids must exist. Optional hideBtn is allowed to be absent.
for m in re.finditer(r"bindClick\('#([^']+)'", main):
    id_ = m.group(1)
    call_tail = main[m.end():m.end()+120]
    optional = ", false" in call_tail.split(");", 1)[0]
    if not optional and id_ not in ids:
        fail.append(f"required bound id missing from index.html: #{id_}")
    if optional and id_ not in ids and id_ != "hideBtn":
        fail.append(f"unexpected optional missing id: #{id_}")

for required in ["sidebar", "stage", "collapseBtn", "openPanelBtn", "avatar", "status"]:
    if required not in ids:
        fail.append(f"required layout id missing: #{required}")

if fail:
    print("FAIL DOM binding/layout check")
    for item in fail:
        print(" -", item)
    raise SystemExit(1)

print(json.dumps({
    "status": "PASS",
    "ids": sorted(ids),
    "message": "DOM 绑定检查通过：缺失可选元素不会导致页面停在初始化中。"
}, ensure_ascii=False, indent=2))
