<template>
  <div class="cluster-graph" ref="container">
    <div v-if="loading" class="graph-loading">
      <div class="loading-pulse"></div>
      <span class="loading-text">Loading knowledge graph...</span>
    </div>
    <div v-else-if="error" class="graph-error">
      <span>Failed to load graph data</span>
    </div>
    <svg ref="svg" :width="width" :height="height">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g class="zoom-layer" ref="zoomLayer">
        <g class="edges-layer"></g>
        <g class="nodes-layer"></g>
      </g>
    </svg>
    <div class="graph-stats">
      <span class="stat">{{ totalNodes }} entries</span>
      <span class="stat-divider"></span>
      <span class="stat">{{ totalClusters }} clusters</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as d3 from 'd3'
import { useGraphData } from '../composables/useGraphData.js'

const CLUSTER_PALETTE = [
  'var(--accent)', // cyan
  '#86c9a3'  // sage
  '#d4b87a'  // warm
  '#c9918e'  // muted-rose
  '#a39bc9'  // lavender
  '#c9a87a'  // sand
  '#8bbdd3'  // steel
  '#8ec9a3'  // mint
]

const router = useRouter()
const { loading, graphData, error, loadGraph } = useGraphData()

const container = ref(null)
const svg = ref(null)
const zoomLayer = ref(null)
const width = ref(0)
const height = ref(0)

const totalNodes = computed(() => graphData.value?.nodes?.length || 0)
const totalClusters = computed(() => graphData.value?.clusters?.length || 0)

let simulation = null
let resizeObserver = null

onMounted(async () => {
  resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      width.value = entry.contentRect.width
      height.value = entry.contentRect.height
    }
  })
  resizeObserver.observe(container.value)

  // Initial size
  const rect = container.value.getBoundingClientRect()
  width.value = rect.width
  height.value = rect.height

  await loadGraph()
  if (graphData.value) {
    render()
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  simulation?.stop()
})

function render() {
  const data = graphData.value
  if (!data || !svg.value) return

  const svgEl = d3.select(svg.value)
  const zoomG = d3.select(zoomLayer.value)
  const edgesG = zoomG.select('.edges-layer')
  const nodesG = zoomG.select('.nodes-layer')

  // Zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.3, 4])
    .on('zoom', (event) => {
      zoomG.attr('transform', event.transform)
    })
  svgEl.call(zoom)

  // Prepare cluster nodes for simulation
  const clusterNodes = data.clusters.map((c, i) => ({
    ...c,
    r: Math.sqrt(c.count) * 4 + 12,
    color: CLUSTER_PALETTE[i % CLUSTER_PALETTE.length]
  }))

  // Build inter-cluster edges
  const nodeClusterMap = new Map()
  for (const node of data.nodes) {
    nodeClusterMap.set(node.id, node.cluster)
  }
  const interClusterEdges = []
  const seen = new Set()
  for (const edge of data.edges) {
    const sc = nodeClusterMap.get(edge.source)
    const tc = nodeClusterMap.get(edge.target)
    if (!sc || !tc || sc === tc) continue
    const key = [sc, tc].sort().join('||')
    if (seen.has(key)) continue
    seen.add(key)
    interClusterEdges.push({ source: sc, target: tc })
  }

  // Force simulation
  simulation = d3.forceSimulation(clusterNodes)
    .force('center', d3.forceCenter(width.value / 2, height.value / 2))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('collision', d3.forceCollide().radius(d => d.r + 8).strength(0.8))
    .force('link', d3.forceLink(interClusterEdges).id(d => d.id).distance(180).strength(0.15))
    .force('x', d3.forceX(width.value / 2).strength(0.04))
    .force('y', d3.forceY(height.value / 2).strength(0.04))
    .alphaDecay(0.02)
    .velocityDecay(0.3)

  // Draw edges
  const edgeSelection = edgesG.selectAll('line')
    .data(interClusterEdges)
    .join('line')
    .attr('stroke', 'rgba(255,255,255,0.06)')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,6')

  // Draw node groups
  const nodeGroups = nodesG.selectAll('g.cluster-node')
    .data(clusterNodes, d => d.id)
    .join('g')
    .attr('class', 'cluster-node')
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      router.push({ name: 'cluster', params: { clusterId: d.id } })
    })
    .on('mouseenter', function (event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .ease(d3.easeCubicOut)
        .attr('r', d.r * 1.12)
        .attr('stroke-opacity', 0.5)

      d3.select(this).select('.node-label')
        .transition()
        .duration(150)
        .attr('opacity', 1)
    })
    .on('mouseleave', function (event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .attr('r', d.r)
        .attr('stroke-opacity', 0.2)

      d3.select(this).select('.node-label')
        .transition()
        .duration(250)
        .attr('opacity', 0.85)
    })

  // Outer glow ring
  nodeGroups.append('circle')
    .attr('r', d => d.r)
    .attr('fill', d => d.color)
    .attr('fill-opacity', 0.08)
    .attr('stroke', d => d.color)
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.2)
    .attr('filter', 'url(#glow)')

  // Label
  nodeGroups.append('text')
    .attr('class', 'node-label')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.15em')
    .attr('fill', 'var(--text-primary)')
    .attr('font-size', d => Math.min(d.r * 0.28, 13))
    .attr('font-family', "'Geist', 'Noto Sans SC', system-ui, sans-serif")
    .attr('font-weight', '500')
    .attr('opacity', 0.85)
    .text(d => d.label.length > 14 ? d.label.slice(0, 12) + '...' : d.label)

  // Count below label
  nodeGroups.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', d => d.r * 0.28 + 12)
    .attr('fill', 'var(--text-secondary)')
    .attr('font-size', 10)
    .attr('font-family', "'Geist Mono', 'JetBrains Mono', monospace")
    .attr('opacity', 0.6)
    .text(d => `${d.count}`)

  // Tick
  simulation.on('tick', () => {
    edgeSelection
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    nodeGroups
      .attr('transform', d => `translate(${d.x},${d.y})`)
  })

  // Initial zoom to fit
  svgEl.call(zoom.transform, d3.zoomIdentity
    .translate(width.value * 0.05, height.value * 0.05)
    .scale(0.9)
  )
}
</script>

<style scoped>
.cluster-graph {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--bg-deep);
  overflow: hidden;
}

svg {
  display: block;
}

.graph-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-pulse {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(34, 211, 238, 0.2);
  border-top-color: var(--accent);
  animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.graph-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c9918e;
  font-family: 'Geist', system-ui, sans-serif;
  font-size: 14px;
}

.graph-stats {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(10, 10, 15, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.stat {
  font-family: 'Geist Mono', 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

.stat-divider {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #3a3a42;
}
</style>
