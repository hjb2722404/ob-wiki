---
title: JIRA 同步行为偏好
category: skills
tags: [工作流, JIRA, 自动化]
sources: [C:/Users/Administrator/.claude/projects/D--projects-intelligence-synergy/memory/feedback_jira_sync.md]
summary: JIRA 任务同步脚本的默认行为偏好——用户未选择任务时应默认全量同步，而非跳过。
provenance:
  extracted: 0.90
  inferred: 0.10
  ambiguous: 0.00
base_confidence: 0.75
lifecycle: draft
lifecycle_changed: 2026-05-13
created: 2026-05-13T18:09:00+08:00
updated: 2026-05-13T18:09:00+08:00
---

# JIRA 同步行为偏好

SessionStart 钩子执行 `jira_to_beads.py` 拉取 JIRA 任务时，用户未选择任务的默认行为规范。

## 规则

如果用户未选择任何任务，应默认**全量同步所有任务**（等同于输入 `all`）。

## 原因

用户在首次会话中未选择任务导致跳过同步，希望改为默认全量同步，避免遗漏工单。 ^[extracted]

## 执行逻辑

1. 会话启动钩子运行 JIRA 同步脚本
2. 如果选择步骤显示「未选择任何任务」
3. 后续操作应以**同步全部任务**为目标
4. 在交互式选择中，如果用户跳过选择，视为选择全部

## 来源

- [[C:/Users/Administrator/.claude/projects/D--projects-intelligence-synergy/memory/feedback_jira_sync.md]]