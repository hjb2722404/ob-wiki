---
title: gstack 文档规范
category: skills
tags: [工作流, 文档规范, gstack]
sources: [C:/Users/Administrator/.claude/projects/D--projects-ai-editor-for-media/memory/feedback_gstack_docs.md]
summary: gstack 技能产生的文档必须存放在项目目录下 docs/g/，且始终用中文撰写，禁止存放在 ~/.gstack/。
provenance:
  extracted: 0.90
  inferred: 0.10
  ambiguous: 0.00
base_confidence: 0.80
lifecycle: draft
lifecycle_changed: 2026-05-13
created: 2026-05-13T18:09:00+08:00
updated: 2026-05-13T18:09:00+08:00
---

# gstack 文档规范

gstack 相关技能（office-hours、plan-eng-review、design-review 等）产生的所有文档，必须遵循以下规则：

## 存放位置

存放到项目目录下的 `docs/gstack/`（即项目文件夹内），**禁止**存放在 `~/.gstack/`。

**原因**：所有项目文档集中管理，随项目一起版本控制，方便回溯和团队共享。 ^[extracted]

## 写作语言

**铁律**：所有文档始终使用**中文**撰写，包括设计文档、评审报告、技术方案等。

## 执行方式

1. gstack 技能产生文档时，指定输出路径为 `项目目录/docs/gstack/`
2. 如果技能脚本强制写入 `~/.gstack/`，完成后再将文件复制到项目目录
3. 最终交付的文档必须在项目目录下

## 相关规范

- [[对话历史记录规范]]
- [[SenseEdit 项目]]

## 来源

- [[C:/Users/Administrator/.claude/projects/D--projects-ai-editor-for-media/memory/feedback_gstack_docs.md]]