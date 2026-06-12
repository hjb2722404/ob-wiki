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

  fs.mkdirSync(PAGES_DIR, { recursive: true })

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
  const skipped = []
  for (const { dir, file, filePath } of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const result = parseMarkdownFile(content)
      parsed.push({
        rawId: file.replace(/\.md$/, ''),
        type: dir,
        ...result,
        filePath
      })
    } catch (e) {
      skipped.push({ file, error: e.message.split('\n')[0] })
    }
  }
  if (skipped.length > 0) {
    console.log(`⚠️  Skipped ${skipped.length} files with parse errors:`)
    for (const s of skipped.slice(0, 5)) {
      console.log(`   - ${s.file}: ${s.error}`)
    }
    if (skipped.length > 5) console.log(`   ... and ${skipped.length - 5} more`)
  }
  console.log(`✅ Parsed ${parsed.length} files successfully`)

  // 解决 ID 冲突：同名文件用 type 前缀区分
  const idCount = new Map()
  for (const p of parsed) {
    idCount.set(p.rawId, (idCount.get(p.rawId) || 0) + 1)
  }
  for (const p of parsed) {
    if (idCount.get(p.rawId) > 1) {
      p.id = `${p.type.slice(0, -1)}:${p.rawId}` // concept:爱, entitiy:爱
    } else {
      p.id = p.rawId
    }
  }

  // 建立从 rawId → nodeId 的映射（用于解析双链 target）
  // 多个 rawId 对应同 rawId 时，优先匹配同 type
  const rawIdToNodeId = new Map()
  for (const p of parsed) {
    const key = p.rawId
    if (!rawIdToNodeId.has(key)) {
      rawIdToNodeId.set(key, p.id)
    }
  }

  // 为聚类准备数据
  const clusterInput = parsed.map(p => ({
    id: p.id,
    type: p.frontmatter.type || p.type,
    tags: p.frontmatter.tags || [],
    links: p.links.map(l => {
      const rawTarget = l.path.split('/').pop()
      return rawIdToNodeId.get(rawTarget) || rawTarget
    })
  }))

  console.log('🔬 Running clustering...')
  const { clusters, nodes: clusteredNodes } = buildClusters(clusterInput)
  console.log(`📊 Found ${clusters.length} clusters`)

  // 构建 graph-data.json
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
  const nodeSet = new Set(clusteredNodes.map(n => n.id))
  for (const p of parsed) {
    for (const link of p.links) {
      const rawTarget = link.path.split('/').pop()
      const targetId = rawIdToNodeId.get(rawTarget) || rawTarget
      const key = [p.id, targetId].sort().join('||')
      if (!edgeSet.has(key) && nodeSet.has(targetId) && p.id !== targetId) {
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
  console.log(`✅ graph-data.json (${(Buffer.byteLength(JSON.stringify(graphData)) / 1024).toFixed(0)} KB)`)

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
  console.log(`✅ search-index.json (${(Buffer.byteLength(JSON.stringify(searchIndex)) / 1024).toFixed(0)} KB)`)

  // 收集 backlinks
  const backlinkMap = new Map()
  for (const p of parsed) {
    for (const link of p.links) {
      const rawTarget = link.path.split('/').pop()
      const targetId = rawIdToNodeId.get(rawTarget) || rawTarget
      if (!backlinkMap.has(targetId)) backlinkMap.set(targetId, [])
      backlinkMap.get(targetId).push(p.id)
    }
  }

  // 构建每个页面的 JSON
  let pageCount = 0
  for (const p of parsed) {
    const html = renderToHtml(p.body)
    const outLinks = [...new Set(p.links.map(l => {
      const rawTarget = l.path.split('/').pop()
      return rawIdToNodeId.get(rawTarget) || rawTarget
    }))]
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

  console.log('\n📈 Build Summary:')
  console.log(`   Nodes: ${graphNodes.length}`)
  console.log(`   Edges: ${edges.length}`)
  console.log(`   Clusters: ${clusters.length}`)
  console.log(`   Pages: ${pageCount}`)
}

main()
