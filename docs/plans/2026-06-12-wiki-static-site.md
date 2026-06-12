# Wiki 静态网站实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **重要：** Task 7-11 涉及 UI 界面实现，**必须** 使用 `taste-skill` 技能指导界面生成。

**Goal:** 将 Obsidian 知识库 wiki 目录发布为带交互式知识图谱的静态网站。

**Architecture:** Node.js 构建脚本解析 5228 个 markdown 文件，提取元数据和双链关系，运行 Louvain 聚类，输出结构化 JSON。Vite + Vue 3 SPA 加载 JSON，D3.js 渲染集群图谱，用户点击导航浏览。

**Tech Stack:** Vite, Vue 3, Vue Router, D3.js v7, Fuse.js, markdown-it, gray-matter, graphology-library, Vercel

**Spec:** `docs/superpowers/specs/2026-06-12-wiki-static-site-design.md`

---

## Task 1: 项目脚手架

**Files:**
- Create: `site/package.json`
- Create: `site/vite.config.js`
- Create: `site/index.html`
- Create: `site/src/main.js`
- Create: `site/src/App.vue`

**Step 1: 初始化 Vite + Vue 3 项目**

```bash
cd "d:/documents/天翼同步盘/知识库/ob-wiki"
mkdir -p site
cd site
npm create vite@latest . -- --template vue
```

**Step 2: 安装核心依赖**

```bash
cd site
npm install vue-router@4 d3@7 fuse.js markdown-it gray-matter graphology graphology-communities-louvain
npm install -D @vitejs/plugin-vue vitest
```

**Step 3: 配置 vite.config.js**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3000
  }
})
```

**Step 4: 创建最小 App.vue 骨架**

```vue
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
</script>
```

**Step 5: 创建占位 main.js**

```js
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

const routes = [
  { path: '/', component: { template: '<div>Home</div>' } },
  { path: '/page/:id', component: { template: '<div>Detail</div>' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

createApp(App).use(router).mount('#app')
```

**Step 6: 验证启动**

```bash
cd site && npm run dev
```

预期：浏览器 `http://localhost:3000` 显示 "Home"，`/page/test` 显示 "Detail"。

**Step 7: Commit**

```bash
git add site/
git commit -m "feat: scaffold Vite + Vue 3 SPA project"
```

---

## Task 2: 构建脚本 — Parser（解析 markdown）

**Files:**
- Create: `site/scripts/build-data.js`（逐步构建）
- Create: `site/scripts/lib/parser.js`
- Create: `site/scripts/lib/parser.test.js`

**Step 1: 写 parser 的失败测试**

```js
// site/scripts/lib/parser.test.js
import { describe, it, expect } from 'vitest'
import { parseMarkdownFile, extractWikiLinks } from './parser.js'

describe('extractWikiLinks', () => {
  it('extracts [[path]] links', () => {
    const text = '参考 [[concepts/辩证法]] 和 [[entities/黑格尔]]'
    const links = extractWikiLinks(text)
    expect(links).toEqual([
      { path: 'concepts/辩证法', display: '辩证法' },
      { path: 'entities/黑格尔', display: '黑格尔' }
    ])
  })

  it('extracts [[path|display]] links', () => {
    const text = '见 [[concepts/辩证法|辩证法方法论]]'
    const links = extractWikiLinks(text)
    expect(links).toEqual([
      { path: 'concepts/辩证法', display: '辩证法方法论' }
    ])
  })

  it('extracts [[sources/...|display]] links', () => {
    const text = '[[sources/精神现象学句读自我如何成为一个实体|精神现象学句读]]'
    const links = extractWikiLinks(text)
    expect(links).toEqual([
      { path: 'sources/精神现象学句读自我如何成为一个实体', display: '精神现象学句读' }
    ])
  })

  it('returns empty array for no links', () => {
    expect(extractWikiLinks('no links here')).toEqual([])
  })
})

describe('parseMarkdownFile', () => {
  it('parses frontmatter and body', () => {
    const content = `---
type: entity
tags:
  - person
aliases:
  - Hegel
---
## Basic Information
Some text with [[concepts/辩证法]].`
    const result = parseMarkdownFile(content)
    expect(result.frontmatter.type).toBe('entity')
    expect(result.frontmatter.tags).toEqual(['person'])
    expect(result.links).toEqual([
      { path: 'concepts/辩证法', display: '辩证法' }
    ])
  })
})
```

**Step 2: 运行测试确认失败**

```bash
cd site && npx vitest run scripts/lib/parser.test.js
```

预期：FAIL — 模块不存在

**Step 3: 实现 parser.js**

```js
// site/scripts/lib/parser.js
import matter from 'gray-matter'

/**
 * 从 markdown 文本中提取所有 [[wiki-link]]
 * 支持 [[path]] 和 [[path|display text]] 两种格式
 */
export function extractWikiLinks(text) {
  const regex = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g
  const links = []
  let match
  while ((match = regex.exec(text)) !== null) {
    links.push({
      path: match[1].trim(),
      display: (match[2] || match[1].split('/').pop()).trim()
    })
  }
  return links
}

/**
 * 解析单个 markdown 文件内容
 * 返回 frontmatter + 正文 + 双链列表 + 预览摘要
 */
export function parseMarkdownFile(content) {
  const { data: frontmatter, content: body } = matter(content)

  // 提取双链（从 frontmatter sources + 正文）
  const allText = [
    ...(frontmatter.sources || []),
    body
  ].join('\n')
  const links = extractWikiLinks(allText)

  // 提取预览摘要：第一段非空、非标题文本（去掉双链标记）
  const cleanBody = body.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, '$2$1')
  const lines = cleanBody.split('\n')
  let summary = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      summary = trimmed.substring(0, 120)
      break
    }
  }

  return {
    frontmatter,
    body,
    links,
    summary
  }
}
```

**Step 4: 运行测试确认通过**

```bash
cd site && npx vitest run scripts/lib/parser.test.js
```

预期：PASS

**Step 5: Commit**

```bash
git add site/scripts/
git commit -m "feat: markdown parser with wiki-link extraction and tests"
```

---

## Task 3: 构建脚本 — Clusterer（聚类算法）

**Files:**
- Create: `site/scripts/lib/clusterer.js`
- Create: `site/scripts/lib/clusterer.test.js`

**Step 1: 写聚类测试**

```js
// site/scripts/lib/clusterer.test.js
import { describe, it, expect } from 'vitest'
import { buildClusters } from './clusterer.js'

describe('buildClusters', () => {
  it('clusters nodes by tags + link density', () => {
    const nodes = [
      { id: '黑格尔', type: 'entity', tags: ['person'], links: ['concepts/辩证法', 'concepts/绝对精神'] },
      { id: '康德', type: 'entity', tags: ['person'], links: ['concepts/辩证法'] },
      { id: '辩证法', type: 'concept', tags: ['theory'], links: ['entities/黑格尔', 'entities/康德'] },
      { id: '绝对精神', type: 'concept', tags: ['theory'], links: ['entities/黑格尔'] },
      { id: '产品定位', type: 'concept', tags: ['method'], links: ['concepts/需求分析'] },
      { id: '需求分析', type: 'concept', tags: ['method'], links: ['concepts/产品定位'] }
    ]
    const result = buildClusters(nodes)
    expect(result.clusters.length).toBeGreaterThanOrEqual(2)
    expect(result.nodes.length).toBe(nodes.length)
    // 每个节点都分配了集群
    result.nodes.forEach(n => {
      expect(n.cluster).toBeDefined()
    })
  })

  it('handles single-node clusters', () => {
    const nodes = [
      { id: '孤独概念', type: 'concept', tags: ['term'], links: [] }
    ]
    const result = buildClusters(nodes)
    expect(result.clusters.length).toBe(1)
  })
})
```

**Step 2: 运行测试确认失败**

```bash
cd site && npx vitest run scripts/lib/clusterer.test.js
```

**Step 3: 实现 clusterer.js**

```js
// site/scripts/lib/clusterer.js
import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'

/**
 * 基于 tags + 双链密度进行混合聚类
 * 1. 先按 tags 初始分组
 * 2. 用 Louvain 社区发现基于链接密度细化
 */
export function buildClusters(rawNodes) {
  // 构建 graphology 图
  const graph = new Graph({ multi: false })

  // 添加节点
  for (const node of rawNodes) {
    graph.addNode(node.id, {
      type: node.type,
      tags: node.tags,
      links: node.links
    })
  }

  // 添加边：从双链关系（双向）
  for (const node of rawNodes) {
    for (const link of node.links) {
      // 从路径中提取目标节点 id（取最后一段，去掉扩展名）
      const targetId = link.split('/').pop().replace(/\.md$/, '')
      if (targetId !== node.id && graph.hasNode(targetId)) {
        try {
          if (!graph.hasEdge(node.id, targetId)) {
            graph.addUndirectedEdge(node.id, targetId)
          }
        } catch (e) {
          // 忽略自环或重复边
        }
      }
    }
  }

  // Louvain 社区发现
  const communities = louvain(graph)

  // 收集集群信息
  const clusterMap = new Map()
  graph.forEachNode((node, attrs) => {
    const clusterId = `cluster-${communities[node]}`
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, {
        id: clusterId,
        nodes: [],
        tags: {}
      })
    }
    const cluster = clusterMap.get(clusterId)
    cluster.nodes.push(node)
    // 统计集群内 tags
    for (const tag of (attrs.tags || [])) {
      cluster.tags[tag] = (cluster.tags[tag] || 0) + 1
    }
  })

  // 为集群生成标签（取出现最多的 tag 或取前几个节点名）
  const clusters = []
  for (const [id, data] of clusterMap) {
    const topTags = Object.entries(data.tags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(t => t[0])
    const label = topTags.length > 0
      ? topTags.join(' · ')
      : data.nodes.slice(0, 2).join(' · ')
    clusters.push({
      id,
      label,
      count: data.nodes.length,
      nodes: data.nodes
    })
  }

  // 按节点数降序排列
  clusters.sort((a, b) => b.count - a.count)

  // 构建输出节点列表
  const nodes = rawNodes.map(node => ({
    ...node,
    cluster: communities[node.id] !== undefined
      ? `cluster-${communities[node.id]}`
      : 'cluster-0'
  }))

  return { clusters, nodes }
}
```

**Step 4: 运行测试确认通过**

```bash
cd site && npx vitest run scripts/lib/clusterer.test.js
```

**Step 5: Commit**

```bash
git add site/scripts/lib/clusterer.js site/scripts/lib/clusterer.test.js
git commit -m "feat: hybrid clustering with tags + Louvain community detection"
```

---

## Task 4: 构建脚本 — 主构建入口（整合 + 输出 JSON）

**Files:**
- Create: `site/scripts/build-data.js`
- Create: `site/scripts/lib/renderer.js`
- Modify: `site/package.json`（添加 scripts）

**Step 1: 实现 markdown → HTML 渲染器**

```js
// site/scripts/lib/renderer.js
import MarkdownIt from 'markdown-it'
import { extractWikiLinks } from './parser.js'

const md = new MarkdownIt({
  html: false,
  linkify: true
})

/**
 * 渲染 markdown 为 HTML，将 [[wiki-link]] 转为 <a> 标签
 */
export function renderToHtml(body) {
  // 先将 [[path|display]] 和 [[path]] 替换为占位 markdown link
  const converted = body.replace(
    /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g,
    (match, path, display) => {
      const text = display || path.split('/').pop()
      // 使用自定义语法，后续替换为 Vue router-link
      return `<a href="#/page/${encodeURIComponent(path)}" class="wiki-link" data-target="${path}">${text}</a>`
    }
  )
  return md.render(converted)
}
```

**Step 2: 实现主构建脚本 build-data.js**

```js
// site/scripts/build-data.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseMarkdownFile } from './lib/parser.js'
import { buildClusters } from './lib/clusterer.js'
import { renderToHtml } from './lib/renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WIKI_DIR = path.resolve(__dirname, '../../wiki')
const OUTPUT_DIR = path.resolve(__dirname, '../public/data')
const PAGES_DIR = path.join(OUTPUT_DIR, 'pages')

function main() {
  console.log('📁 Reading wiki files from:', WIKI_DIR)

  // 确保输出目录存在
  fs.mkdirSync(PAGES_DIR, { recursive: true })

  // 收集所有 md 文件（排除 schema, index, log）
  const dirs = ['concepts', 'entities', 'sources', 'synthesis', 'contradictions']
  const files = []

  for (const dir of dirs) {
    const dirPath = path.join(WIKI_DIR, dir)
    if (!fs.existsSync(dirPath)) continue
    const entries = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'))
    for (const file of entries) {
      files.push({ dir, file, filePath: path.join(dirPath, file) })
    }
  }

  console.log(`📄 Found ${files.length} files`)

  // 解析所有文件
  const parsed = []
  for (const { dir, file, filePath } of files) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const result = parseMarkdownFile(content)
    const id = file.replace(/\.md$/, '')
    parsed.push({
      id,
      type: dir,
      ...result,
      filePath
    })
  }

  // 为聚类准备数据
  const clusterInput = parsed.map(p => ({
    id: p.id,
    type: p.frontmatter.type || p.type,
    tags: p.frontmatter.tags || [],
    links: p.links.map(l => l.path)
  }))

  console.log('🔬 Running clustering...')
  const { clusters, nodes: clusteredNodes } = buildClusters(clusterInput)
  console.log(`📊 Found ${clusters.length} clusters`)

  // 构建 graph-data.json
  const nodeMap = new Map(clusteredNodes.map(n => [n.id, n]))
  const previewMap = new Map(parsed.map(p => [p.id, p.summary]))

  const graphNodes = clusteredNodes.map(n => ({
    id: n.id,
    type: n.type,
    tags: n.tags,
    cluster: n.cluster,
    preview: {
      title: n.id,
      tags: n.tags,
      summary: previewMap.get(n.id) || ''
    }
  }))

  // 构建边（去重）
  const edgeSet = new Set()
  const edges = []
  for (const p of parsed) {
    for (const link of p.links) {
      const targetId = link.path.split('/').pop()
      const key = [p.id, targetId].sort().join('||')
      if (!edgeSet.has(key) && nodeMap.has(targetId) && p.id !== targetId) {
        edgeSet.add(key)
        edges.push({ source: p.id, target: targetId })
      }
    }
  }

  const graphData = { clusters, nodes: graphNodes, edges }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'graph-data.json'),
    JSON.stringify(graphData)
  )
  console.log(`✅ graph-data.json (${(JSON.stringify(graphData).length / 1024).toFixed(0)} KB)`)

  // 构建 search-index.json
  const searchIndex = parsed.map(p => ({
    id: p.id,
    type: p.frontmatter.type || p.type,
    tags: p.frontmatter.tags || [],
    aliases: p.frontmatter.aliases || []
  }))
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'search-index.json'),
    JSON.stringify(searchIndex)
  )
  console.log(`✅ search-index.json (${(JSON.stringify(searchIndex).length / 1024).toFixed(0)} KB)`)

  // 构建每个页面的 JSON
  // 收集 backlinks
  const backlinkMap = new Map()
  for (const p of parsed) {
    for (const link of p.links) {
      const targetId = link.path.split('/').pop()
      if (!backlinkMap.has(targetId)) backlinkMap.set(targetId, [])
      backlinkMap.get(targetId).push(p.id)
    }
  }

  let pageCount = 0
  for (const p of parsed) {
    const html = renderToHtml(p.body)
    const outLinks = [...new Set(p.links.map(l => l.path.split('/').pop()))]
    const backlinks = [...new Set(backlinkMap.get(p.id) || [])]

    const pageData = {
      id: p.id,
      type: p.frontmatter.type || p.type,
      frontmatter: p.frontmatter,
      html,
      links: outLinks,
      backlinks
    }
    fs.writeFileSync(
      path.join(PAGES_DIR, `${p.id}.json`),
      JSON.stringify(pageData)
    )
    pageCount++
  }
  console.log(`✅ ${pageCount} page JSON files written to pages/`)

  // 输出统计
  console.log('\n📈 Build Summary:')
  console.log(`   Nodes: ${graphNodes.length}`)
  console.log(`   Edges: ${edges.length}`)
  console.log(`   Clusters: ${clusters.length}`)
  console.log(`   Pages: ${pageCount}`)
}

main()
```

**Step 3: 添加 npm scripts 到 package.json**

在 `site/package.json` 中添加：
```json
{
  "scripts": {
    "dev": "vite",
    "build": "node scripts/build-data.js && vite build",
    "build:data": "node scripts/build-data.js",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "type": "module"
}
```

**Step 4: 运行构建脚本验证**

```bash
cd site && npm run build:data
```

预期：`public/data/` 下生成 `graph-data.json`、`search-index.json` 和 `pages/*.json`。

**Step 5: 验证输出文件**

```bash
ls -la site/public/data/
ls site/public/data/pages/ | wc -l
```

预期：graph-data.json、search-index.json 存在，pages/ 下有 5000+ 文件。

**Step 6: Commit**

```bash
git add site/scripts/build-data.js site/scripts/lib/renderer.js site/package.json site/public/data/
git commit -m "feat: complete build pipeline — parser + clusterer + JSON output"
```

---

## Task 5: Vue Router + 路由配置

**Files:**
- Modify: `site/src/main.js`
- Create: `site/src/router/index.js`

**Step 1: 创建路由配置**

```js
// site/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../components/HomeView.vue')
  },
  {
    path: '/cluster/:clusterId',
    name: 'cluster',
    component: () => import('../components/ClusterView.vue')
  },
  {
    path: '/page/:id',
    name: 'page',
    component: () => import('../components/DetailView.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

**Step 2: 更新 main.js 使用路由**

```js
// site/src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
```

**Step 3: 创建占位视图组件**

创建三个最小占位组件，后续 Task 替换：

- `site/src/components/HomeView.vue` — `<template><div>Graph Home</div></template>`
- `site/src/components/ClusterView.vue` — `<template><div>Cluster View</div></template>`
- `site/src/components/DetailView.vue` — `<template><div>Detail Page: {{ $route.params.id }}</div></template>`

**Step 4: 验证路由跳转**

```bash
cd site && npm run dev
```

访问 `/`、`/cluster/test`、`/page/黑格尔` 确认路由工作。

**Step 5: Commit**

```bash
git add site/src/
git commit -m "feat: Vue Router with home, cluster, detail routes"
```

---

## Task 6: 数据加载 Composables

**Files:**
- Create: `site/src/composables/useGraphData.js`
- Create: `site/src/composables/useSearch.js`

**Step 1: 实现 useGraphData composable**

```js
// site/src/composables/useGraphData.js
import { ref, shallowRef } from 'vue'

let graphDataCache = null
const pageCache = new Map()

export function useGraphData() {
  const loading = ref(false)
  const graphData = shallowRef(null)
  const error = ref(null)

  async function loadGraph() {
    if (graphDataCache) {
      graphData.value = graphDataCache
      return
    }
    loading.value = true
    error.value = null
    try {
      const resp = await fetch('/data/graph-data.json')
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      graphDataCache = data
      graphData.value = data
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function loadPage(id) {
    if (pageCache.has(id)) return pageCache.get(id)
    const resp = await fetch(`/data/pages/${encodeURIComponent(id)}.json`)
    if (!resp.ok) throw new Error(`Page not found: ${id}`)
    const data = await resp.json()
    pageCache.set(id, data)
    return data
  }

  return { loading, graphData, error, loadGraph, loadPage }
}
```

**Step 2: 实现 useSearch composable**

```js
// site/src/composables/useSearch.js
import { ref, shallowRef } from 'vue'
import Fuse from 'fuse.js'

let fuseCache = null

export function useSearch() {
  const results = ref([])
  const loading = ref(false)

  async function initIndex() {
    if (fuseCache) return
    loading.value = true
    try {
      const resp = await fetch('/data/search-index.json')
      const data = await resp.json()
      fuseCache = new Fuse(data, {
        keys: [
          { name: 'id', weight: 0.5 },
          { name: 'tags', weight: 0.3 },
          { name: 'aliases', weight: 0.2 }
        ],
        threshold: 0.3,
        includeScore: true
      })
    } finally {
      loading.value = false
    }
  }

  function search(query) {
    if (!fuseCache || !query.trim()) {
      results.value = []
      return
    }
    results.value = fuseCache.search(query, { limit: 20 }).map(r => r.item)
  }

  return { results, loading, initIndex, search }
}
```

**Step 3: Commit**

```bash
git add site/src/composables/
git commit -m "feat: data loading + search composables with caching"
```

---

## Task 7: 首页 — 集群图谱组件 ⚡ taste-skill

> **⚠️ 此 Task 实现时必须使用 `taste-skill` 技能指导界面设计**

**Files:**
- Modify: `site/src/components/HomeView.vue`
- Create: `site/src/components/ClusterGraph.vue`

**Step 1: 实现 ClusterGraph.vue（D3.js 集群气泡图）**

核心逻辑：
- 接收 `clusters` 和 `edges` props
- D3 forceSimulation 布局集群气泡
- 气泡半径 = `Math.sqrt(count) * scale`
- 集群间连线用虚线
- SVG 渲染
- 点击集群 → `$router.push({ name: 'cluster', params: { clusterId } })`
- 滚轮缩放（d3.zoom），拖拽平移

使用 `useGraphData` composable 加载 `graph-data.json`。

**Step 2: 实现 HomeView.vue**

布局：
- 顶部固定 SearchBar 组件
- 主体区域 ClusterGraph
- 底部统计栏

**Step 3: 启动 `taste-skill` 进行 UI 调优**

**Step 4: 浏览器验证**

```bash
cd site && npm run dev
```

访问首页，确认：
- 集群气泡正确显示
- 气泡大小反映节点数
- 缩放/拖拽正常
- 点击集群跳转 `/cluster/:id`

**Step 5: Commit**

```bash
git add site/src/components/
git commit -m "feat: cluster graph homepage with D3.js force layout"
```

---

## Task 8: 集群展开视图 ⚡ taste-skill

> **⚠️ 此 Task 实现时必须使用 `taste-skill` 技能指导界面设计**

**Files:**
- Modify: `site/src/components/ClusterView.vue`
- Create: `site/src/components/NodeGraph.vue`

**Step 1: 实现 NodeGraph.vue**

核心逻辑：
- 根据 `clusterId` 从 graphData 中筛选属于该集群的节点 + 内部边
- D3 forceSimulation 布局节点
- 节点颜色按 type 区分（entity/concept/source）
- 悬停节点高亮关联边
- 点击节点 → `$router.push({ name: 'page', params: { id } })`
- 返回按钮回到首页

**Step 2: 实现 ClusterView.vue**

布局：
- 顶部面包屑：首页 > 集群名
- 主体 NodeGraph
- 统计信息（节点数、类型分布）

**Step 3: 启动 `taste-skill` 进行 UI 调优**

**Step 4: 浏览器验证**

从首页点击集群 → 确认节点图谱正确渲染 → 点击节点跳转详情。

**Step 5: Commit**

```bash
git add site/src/components/
git commit -m "feat: cluster expand view with node-level graph"
```

---

## Task 9: 详情页组件 ⚡ taste-skill

> **⚠️ 此 Task 实现时必须使用 `taste-skill` 技能指导界面设计**

**Files:**
- Modify: `site/src/components/DetailView.vue`
- Create: `site/src/components/Breadcrumb.vue`

**Step 1: 实现 Breadcrumb.vue**

Props: `items` (Array of `{ label, to }`)

**Step 2: 实现 DetailView.vue**

核心逻辑：
- `useGraphData().loadPage(id)` 加载页面 JSON
- 渲染 HTML 内容（v-html）
- 拦截 `.wiki-link` 点击事件 → router push
- 底部显示 links 和 backlinks 作为标签
- 面包屑：图谱 > 集群名 > 条目名（从 graphData 中获取集群信息）

**Step 3: 启动 `taste-skill` 进行 UI 调优**

**Step 4: 浏览器验证**

从集群视图点击节点 → 确认详情页渲染正确 → 双链可点击。

**Step 5: Commit**

```bash
git add site/src/components/
git commit -m "feat: detail page with wiki-link navigation"
```

---

## Task 10: Hover 预览组件 ⚡ taste-skill

> **⚠️ 此 Task 实现时必须使用 `taste-skill` 技能指导界面设计**

**Files:**
- Create: `site/src/components/HoverPreview.vue`
- Modify: `site/src/components/DetailView.vue`（集成 HoverPreview）

**Step 1: 实现 HoverPreview.vue**

核心逻辑：
- 悬停 `.wiki-link` 时，从 `graphData.nodes` 中查找对应节点的 `preview` 数据
- 浮动卡片定位在鼠标附近
- 显示：标题 + 类型标签 + tags + 摘要
- 点击跳转详情页
- 防抖：悬停 200ms 后才显示，避免快速划过闪烁

**Step 2: 集成到 DetailView.vue**

监听详情页中 `.wiki-link` 元素的 mouseenter/mouseleave 事件。

**Step 3: 启动 `taste-skill` 进行 UI 调优**

**Step 4: 浏览器验证**

详情页中悬停双链 → 确认预览卡片正确显示和定位。

**Step 5: Commit**

```bash
git add site/src/components/HoverPreview.vue
git commit -m "feat: hover preview card for wiki links"
```

---

## Task 11: 全局搜索组件 ⚡ taste-skill

> **⚠️ 此 Task 实现时必须使用 `taste-skill` 技能指导界面设计**

**Files:**
- Create: `site/src/components/SearchBar.vue`
- Modify: `site/src/components/HomeView.vue`（集成 SearchBar）

**Step 1: 实现 SearchBar.vue**

核心逻辑：
- 使用 `useSearch` composable
- 输入时 debounce 300ms 后调用 `search(query)`
- 下拉列表显示匹配结果（标题 + tags + 类型图标）
- 点击结果 → `$router.push({ name: 'page', params: { id } })`
- ESC 关闭下拉
- 点击外部关闭下拉

**Step 2: 集成到 HomeView.vue**

顶部固定定位。

**Step 3: 启动 `taste-skill` 进行 UI 调优**

**Step 4: 浏览器验证**

首页搜索栏输入 → 确认实时过滤 → 点击跳转。

**Step 5: Commit**

```bash
git add site/src/components/SearchBar.vue
git commit -m "feat: global search with Fuse.js fuzzy matching"
```

---

## Task 12: 全局样式 + 最终调优 ⚡ taste-skill

> **⚠️ 此 Task 实现时必须使用 `taste-skill` 技能指导界面设计**

**Files:**
- Create: `site/src/assets/main.css`
- Modify: `site/src/main.js`（import 样式）
- Modify: `site/src/App.vue`

**Step 1: 创建全局样式**

- 深色主题 CSS 变量
- 字体栈（中文优先：思源黑体 / Noto Sans SC）
- 响应式基础（min-width: 768px 断点）
- 全局链接/滚动条样式

**Step 2: 更新 App.vue**

添加全局布局容器和过渡动画。

**Step 3: 启动 `taste-skill` 做最终视觉审查**

**Step 4: 全流程验证**

```bash
cd site && npm run dev
```

- 首页图谱 → 点击集群 → 点击节点 → 详情页 → hover 预览 → 搜索
- 全链路确认

**Step 5: Commit**

```bash
git add site/src/assets/ site/src/main.js site/src/App.vue
git commit -m "feat: global dark theme and final UI polish"
```

---

## Task 13: 部署配置

**Files:**
- Create: `site/vercel.json`
- Modify: `site/package.json`（确保 build scripts 正确）

**Step 1: 创建 vercel.json**

```json
{
  "buildCommand": "cd site && npm install && npm run build",
  "outputDirectory": "site/dist",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**Step 2: 验证完整构建**

```bash
cd site && npm run build
```

预期：`site/dist/` 下生成完整的静态文件。

**Step 3: 本地预览**

```bash
cd site && npm run preview
```

确认所有功能正常。

**Step 4: Commit**

```bash
git add site/vercel.json
git commit -m "feat: Vercel deployment config"
```

**Step 5: 部署到 Vercel**

通过 Vercel CLI 或 GitHub 连接部署：
```bash
cd site && npx vercel
```

---

## 任务依赖关系

```
Task 1 (脚手架)
  → Task 2 (Parser) → Task 3 (Clusterer) → Task 4 (构建脚本)
  → Task 5 (Router) → Task 6 (Composables)
                       ↘
                        Task 7 (首页图谱) ⚡ taste-skill
                          → Task 8 (集群展开) ⚡ taste-skill
                            → Task 9 (详情页) ⚡ taste-skill
                              → Task 10 (Hover 预览) ⚡ taste-skill
                        Task 11 (搜索) ⚡ taste-skill（可与 7-10 并行）
  → Task 12 (全局样式) ⚡ taste-skill（依赖 7-11 完成）
  → Task 13 (部署)
```

**并行机会：** Task 11（搜索）可与 Task 7-10 并行开发，因为仅依赖 Task 6（composables）。
