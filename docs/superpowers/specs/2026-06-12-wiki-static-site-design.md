# Wiki 静态网站设计规格

> 将 Obsidian 知识库 wiki 目录发布为交互式静态网站

## 背景

项目根目录下 `wiki/` 包含 5228 个 markdown 条目，分布在 6 个子目录：
- `concepts/` (3850) — 概念卡片
- `entities/` (1093) — 实体卡片
- `sources/` (270) — 来源卡片
- `synthesis/` (12) — 综合卡片
- `contradictions/` (1) — 冲突卡片
- `schema/` (1) — schema 配置

每个文件有 YAML frontmatter（type, sources, tags, aliases），正文使用 `[[path|Display Name]]` 双链格式。

## 需求

1. **集群图谱首页** — 分层展示知识图谱，先看集群概览，点击展开具体节点
2. **详情页** — 点击节点进入条目详情，展示完整内容
3. **双链交互** — 详情页中双链可 hover 预览摘要，点击跳转
4. **全局搜索** — 按标题和 tags 实时过滤
5. **免费部署** — 静态托管，无服务器成本

## 架构

### 方案：预计算元数据 + 浏览器端布局

数据在构建时预计算，图谱节点位置在浏览器动态计算。

### 构建流水线 (Node.js)

```
wiki/*.md → Parser → Clusterer → 输出 JSON
```

1. **Parser**：遍历所有 md 文件，提取 YAML frontmatter + 正文双链关系
2. **Clusterer**：混合聚类策略
   - 第一层：按 frontmatter tags 初始分组（theory, person, method…）
   - 第二层：基于双链连接密度，使用 Louvain 社区发现算法细化/合并分组
3. 输出 4 类 JSON 文件：

| 文件 | 内容 | 大小估算 |
|------|------|----------|
| `graph-data.json` | 节点（id, name, tags, cluster, type）+ 边（source→target） | ~200KB gzipped |
| `pages/{id}.json` | 单条目完整内容（frontmatter + 渲染后 HTML） | 按需加载 |
| `search-index.json` | 标题 + tags + aliases 扁平索引 | ~100KB gzipped |
| `previews/{id}.json` | 标题 + tags + 一句话摘要 | 合并到 graph-data.json 内联 |

**优化**：hover 预览数据（标题 + tags + 摘要）直接内联到 `graph-data.json` 中，避免额外网络请求。

### 运行时 (SPA)

```
index.html → 加载 graph-data.json → D3.js 力导向布局 → 用户交互
```

## 技术栈

| 层级 | 选择 | 理由 |
|------|------|------|
| 框架 | Vite + Vue 3 | 轻量 SPA，构建快 |
| 图谱渲染 | D3.js v7 (SVG) | 集群级渲染（~20-50 节点），SVG 足够 |
| 聚类算法 | Louvain 社区发现 | tags 初始化 + 链接密度优化 |
| 搜索 | Fuse.js | 前端模糊搜索，无需后端 |
| 部署 | Vercel 或 Cloudflare Pages | 免费静态托管，自动 CI/CD |
| Markdown 渲染 | markdown-it + frontmatter 插件 | 构建时解析，输出 HTML |

## 页面设计

### 首页：集群图谱

- **深色背景**，气泡式集群可视化
- 气泡大小反映节点数量
- 集群间虚线表示跨集群关联
- 顶部：搜索栏（实时过滤标题 + tags）
- 底部：统计信息（条目总数、集群数）
- 交互：点击集群 → 展开为内部节点图谱（力导向布局），再次点击节点 → 进入详情页
- 滚轮缩放，拖拽平移

### 详情页

- **面包屑导航**：图谱 → 集群名 → 条目名
- **元信息区**：类型标签（concept/entity）+ tags
- **正文区**：完整条目内容，双链渲染为蓝色虚线下划线高亮
- **关联条目区**：底部展示所有双链关联的条目标签，按类型着色
- **Hover 预览**：悬停双链时弹出浮动卡片（标题 + 类型 + tags + 一句话摘要），点击跳转

### 搜索

- 顶部固定搜索栏
- 输入时实时过滤，下拉显示匹配条目列表（标题 + tags）
- 点击结果跳转详情页
- 搜索数据来源：`search-index.json`

## 数据模型

### graph-data.json 结构

```json
{
  "clusters": [
    {
      "id": "cluster-0",
      "label": "德国古典哲学",
      "count": 384,
      "nodes": ["黑格尔", "康德", "辩证法", ...]
    }
  ],
  "nodes": [
    {
      "id": "黑格尔",
      "type": "entity",
      "tags": ["person"],
      "cluster": "cluster-0",
      "preview": {
        "title": "黑格尔",
        "tags": ["person"],
        "summary": "德国哲学家，德国古典哲学集大成者..."
      }
    }
  ],
  "edges": [
    { "source": "辩证法", "target": "黑格尔" },
    { "source": "辩证法", "target": "否定之否定" }
  ]
}
```

### pages/{id}.json 结构

```json
{
  "id": "黑格尔",
  "type": "entity",
  "frontmatter": { "type": "entity", "tags": ["person"], ... },
  "html": "<h2>Basic Information</h2><p>...</p>",
  "links": ["康德", "辩证法", "精神现象学", ...],
  "backlinks": ["辩证法", "马克思主义", ...]
}
```

## 构建脚本设计

脚本位于项目 `scripts/` 目录，作为 npm scripts 运行。

1. `scripts/build-data.js` — 主构建脚本
   - 遍历 `wiki/` 所有 md 文件
   - 解析 frontmatter（gray-matter）
   - 解析双链（正则提取 `[[path|text]]` 和 `[[path]]`）
   - 渲染 markdown 为 HTML（markdown-it）
   - 提取每条目的第一段作为预览摘要
   - 运行 Louvain 聚类（graphology-library）
   - 输出所有 JSON 到 `public/data/`

2. 集成到 Vite 构建：`npm run build` 先执行 `build-data`，再执行 `vite build`

## 目录结构

```
ob-wiki/
├── wiki/                    # 数据源（不修改）
├── site/                    # SPA 项目根目录
│   ├── package.json
│   ├── vite.config.js
│   ├── scripts/
│   │   └── build-data.js    # 数据构建脚本
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.js
│   │   ├── components/
│   │   │   ├── ClusterGraph.vue    # 首页图谱
│   │   │   ├── NodeGraph.vue       # 集群展开节点图谱
│   │   │   ├── DetailPage.vue      # 详情页
│   │   │   ├── HoverPreview.vue    # 悬浮预览卡片
│   │   │   ├── SearchBar.vue       # 搜索栏
│   │   │   └── Breadcrumb.vue      # 面包屑导航
│   │   ├── composables/
│   │   │   ├── useGraph.js         # D3 图谱逻辑
│   │   │   └── useSearch.js        # Fuse.js 搜索逻辑
│   │   └── router/
│   │       └── index.js            # Vue Router
│   └── public/
│       └── data/                   # 构建生成的 JSON
│           ├── graph-data.json
│           ├── search-index.json
│           └── pages/
│               ├── 黑格尔.json
│               ├── 辩证法.json
│               └── ...
└── docs/
    └── superpowers/
        └── specs/
            └── this-file.md
```

## 不做的事

- 不做 wiki 内容的编辑功能（只读发布）
- 不做用户认证
- 不做 SSR（纯 SPA）
- 不做移动端适配优先（桌面优先，响应式作为后续优化）
- 不处理 `sources/` 目录的详情页（来源卡片仅在详情页中作为引用显示）
