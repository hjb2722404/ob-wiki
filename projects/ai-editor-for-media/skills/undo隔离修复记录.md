---
title: Undo 隔离修复记录
category: skills
tags: [ProseMirror, TipTap, Vue3, Bug修复]
sources: [C:/Users/Administrator/.claude/projects/D--projects-ai-editor-for-media/memory/undo-fix-status.md]
summary: ProseMirror undo 在 Vue3 TipTap 环境下的隔离修复方案——统一使用 @z-editor/core，移除 @tiptap/vue-3 依赖。
provenance:
  extracted: 0.85
  inferred: 0.10
  ambiguous: 0.05
base_confidence: 0.75
lifecycle: draft
lifecycle_changed: 2026-05-13
created: 2026-05-13T18:09:00+08:00
updated: 2026-05-13T18:09:00+08:00
---

# Undo 隔离修复记录

Phase 1 Undo 隔离修复 — **已完成并验证（2026-04-21）**

## 最终方案

移除 `@tiptap/vue-3` 依赖，`Editor.vue` 改用 `@z-editor/core` 的 `createEditor`，通过直接 `appendChild(view.dom)` 挂载到 DOM。

## 根因分析

1. **原实现的错误**：用 `removeChild + appendChild` 移动 TipTap DOM 元素，破坏 ProseMirror 事件处理 ^[extracted]
2. **中间方案的冲突**：改用 `@tiptap/vue-3` 的 `useEditor`，但与 `@z-editor/core` 共存时，Vite dev 模式产生重复 `@tiptap/core` 实例（`Adding different instances of a keyed plugin`） ^[extracted]
3. **最终方案**：所有 TipTap 实例化统一走 `@z-editor/core`，ui-vue 不直接依赖任何 TipTap ^[extracted]

## 验证结果

三层 undo 逐步回退：输入修正 → 撤销追加文字 → 撤销修正 → 撤销原始输入，全部正常。 ^[extracted]

## 变更文件

- `packages/ui-vue/src/Editor.vue` — 使用 createEditor + appendChild
- `packages/ui-vue/package.json` — 移除 @tiptap/vue-3 与 TipTap peerDeps
- `apps/demo/package.json` — 移除 @tiptap/vue-3 和多余 devDeps
- `apps/demo/vite.config.ts` — 还原原始配置

## 相关概念

- [[SenseEdit 项目]] — 所属项目
- [[ProseMirror]] — 底层编辑器框架

## 来源

- [[C:/Users/Administrator/.claude/projects/D--projects-ai-editor-for-media/memory/undo-fix-status.md]]