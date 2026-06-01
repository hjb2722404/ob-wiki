---
title: Sketch 设计稿转 React 代码技能
category: skills
tags: [AI, Sketch, React, 前端, Claude-Code, MeaXure]
sources: [C:/Users/Administrator/.claude/projects/D--projects-studyProjects-sketch-plugin/memory/project_sketch_to_react_skill.md]
summary: 将 Sketch 设计稿通过 MeaXure 导出 + Claude Code 视觉理解，自动生成 React/AntD 前端代码的技术方案。
provenance:
  extracted: 0.75
  inferred: 0.20
  ambiguous: 0.05
base_confidence: 0.70
lifecycle: draft
lifecycle_changed: 2026-05-13
created: 2026-05-13T18:09:00+08:00
updated: 2026-05-13T18:09:00+08:00
---

# Sketch 设计稿转 React 代码技能

将 Sketch 设计稿通过 MeaXure 导出 + Claude Code 视觉理解，自动生成 React/AntD 前端代码。

## 分工

- **设计师**：Sketch 设计 → MeaXure 导出（零学习成本，有现成工具）
- **前端工程师**：拿到导出资产 → 用 skill 生成代码

## 核心技术方案（已验证可行）

**混合方案：AI 视觉理解 + Sketch 精确数据**

1. Claude Code 看 MeaXure 预览截图 → 理解布局和组件结构（语义层）
2. 读 MeaXure HTML 内嵌的图层 JSON → 按坐标匹配组件 → 提取精确样式值（精确层）
3. 生成语义 JSON Schema → 从 JSON 生成 React 代码

## 已验证的关键数据

- **坐标匹配**：60/10 组件 100% 匹配成功，0px 偏移
- **JSON Schema V2** 生成页面评分：8/10（V1 仅 5/10）
- **静态资产集成**：成功将 MeaXure 导出的 SVG/PNG 集成到生成页面

## JSON Schema V2 关键设计决策

- 卡片网格：CSS Grid `repeat(3, 440px)`，非 flex-wrap（精确 +2px 布局）
- 卡片内部：`image(216) + text(0 间距) + 28px + button(32) = 296px`，无底部 padding
- Header 图标间距：统一 24px，divider 到用户 2px
- 直接使用 hex/rgba 颜色值，不需 token 解析
- 三级资产类型：`svg`（品牌资产）、`antd-icon`（小图标映射）、`placeholder`（插图）

## 已知限制

- **命名冲突**：MeaXure 导出时不同插图导出同名文件互相覆盖，需用 objectID 做唯一命名
- **Ant Design Button** 对中文短文本自动添加 letter-spacing
- 设计稿中 divider 在 header 背景上对比度极低

## 相关资源

- `test-data/default-page.json` — V2 语义 JSON Schema（含 renderInstructions、精确像素值、CSS Grid 布局）
- `test-data/meaxure_data.json` — MeaXure 完整导出数据（2 个 artboard，2.1M 字符）
- `test-data/coord_match.py` — 坐标匹配实验脚本
- `login-app/src/DefaultPage.tsx` — AI 生成的 React 页面

## 来源

- [[C:/Users/Administrator/.claude/projects/D--projects-studyProjects-sketch-plugin/memory/project_sketch_to_react_skill.md]]