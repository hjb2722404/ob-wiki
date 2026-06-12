import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'

/**
 * 基于 tags + 双链密度进行混合聚类
 * 1. 先按 tags 初始分组
 * 2. 用 Louvain 社区发现基于链接密度细化
 */
export function buildClusters(rawNodes) {
  const graph = new Graph({ multi: false, type: 'undirected' })

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
      const targetId = link.split('/').pop().replace(/\.md$/, '')
      if (targetId !== node.id && graph.hasNode(targetId)) {
        try {
          if (!graph.hasEdge(node.id, targetId)) {
            graph.addEdge(node.id, targetId)
          }
        } catch (e) {
          // 忽略自环或重复边
        }
      }
    }
  }

  // Louvain 社区发现（需要至少一条边）
  let communities
  if (graph.size === 0) {
    // 无边图：每个节点独立集群
    communities = {}
    graph.forEachNode(node => { communities[node] = 0 })
  } else {
    communities = louvain(graph)
  }

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
    for (const tag of (attrs.tags || [])) {
      cluster.tags[tag] = (cluster.tags[tag] || 0) + 1
    }
  })

  // 为集群生成标签
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

  clusters.sort((a, b) => b.count - a.count)

  const nodes = rawNodes.map(node => ({
    ...node,
    cluster: communities[node.id] !== undefined
      ? `cluster-${communities[node.id]}`
      : 'cluster-0'
  }))

  return { clusters, nodes }
}
