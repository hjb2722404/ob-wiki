<template>
  <div class="node-graph" ref="container">
    <div v-if="loading" class="graph-loading">
      <div class="loading-pulse"></div>
      <span class="loading-text">Expanding cluster...</span>
    </div>
    <svg ref="svg" :width="width" :height="height">
      <g class="zoom-layer" ref="zoomLayer">
        <g class="edges-layer"></g>
        <g class="nodes-layer"></g>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as d3 from 'd3'
import { useGraphData } from '../composables/useGraphData.js'

const TYPE_COLORS = {
  entity: '#6366f1',
  concept: '#10b981',
  source: '#f59e0b',
  synthesis: '#8b5cf6',
  contradiction: '#ef4444'
}

const props = defineProps({
  clusterId: { type: String, required: true }
})

const emit = defineEmits(['select-node'])

const router = useRouter()
const { graphData, loadGraph } = useGraphData()

const container = ref(null)
const svg = ref(null)
const zoomLayer = ref(null)
const width = ref(0)
const height = ref(0)
const loading = ref(true)

let simulation = null
let resizeObserver = null

onMounted(async () => {
  await loadGraph()

  resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      width.value = entry.contentRect.width
      height.value = entry.contentRect.height
    }
  })
  resizeObserver.observe(container.value)

  const rect = container.value.getBoundingClientRect()
  width.value = rect.width
  height.value = rect.height

  render()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  simulation?.stop()
})

function render() {
  const data = graphData.value
  if (!data || !svg.value) return

  loading.value = false

  // Filter nodes in this cluster
  const clusterNodeIds = new Set(
    data.nodes.filter(n => n.cluster === props.clusterId).map(n => n.id)
  )

  const clusterNodes = data.nodes
    .filter(n => n.cluster === props.clusterId)
    .map(n => ({
      ...n,
      color: TYPE_COLORS[n.type] || '#94a3b8',
      r: 6
    }))

  const clusterEdges = data.edges.filter(
    e => clusterNodeIds.has(e.source) && clusterNodeIds.has(e.target)
  )

  if (clusterNodes.length === 0) return

  const svgEl = d3.select(svg.value)
  const zoomG = d3.select(zoomLayer.value)
  const edgesG = zoomG.select('.edges-layer')
  const nodesG = zoomG.select('.nodes-layer')

  const zoom = d3.zoom()
    .scaleExtent([0.3, 6])
    .on('zoom', (event) => {
      zoomG.attr('transform', event.transform)
    })
  svgEl.call(zoom)

  simulation = d3.forceSimulation(clusterNodes)
    .force('center', d3.forceCenter(width.value / 2, height.value / 2))
    .force('charge', d3.forceManyBody().strength(-30))
    .force('collision', d3.forceCollide().radius(10))
    .force('link', d3.forceLink(clusterEdges).id(d => d.id).distance(40).strength(0.3))
    .force('x', d3.forceX(width.value / 2).strength(0.03))
    .force('y', d3.forceY(height.value / 2).strength(0.03))
    .alphaDecay(0.02)
    .velocityDecay(0.3)

  // Edges
  const edgeSelection = edgesG.selectAll('line')
    .data(clusterEdges)
    .join('line')
    .attr('stroke', 'rgba(0,0,0,0.06)')
    .attr('stroke-width', 0.8)

  // Nodes
  const nodeGroups = nodesG.selectAll('g.node')
    .data(clusterNodes, d => d.id)
    .join('g')
    .attr('class', 'node')
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })
    )
    .on('click', (event, d) => {
      router.push({ name: 'page', params: { id: d.id } })
    })
    .on('mouseenter', function (event, d) {
      d3.select(this).select('circle')
        .transition().duration(150).ease(d3.easeCubicOut)
        .attr('r', 9)
        .attr('fill-opacity', 1)

      d3.select(this).select('text')
        .transition().duration(100)
        .attr('opacity', 1)

      // Highlight connected edges
      edgeSelection
        .attr('stroke', e =>
          (e.source.id || e.source) === d.id || (e.target.id || e.target) === d.id
            ? 'rgba(99,102,241,0.3)' : 'rgba(0,0,0,0.06)'
        )
    })
    .on('mouseleave', function (event, d) {
      d3.select(this).select('circle')
        .transition().duration(250)
        .attr('r', 6)
        .attr('fill-opacity', 0.7)

      d3.select(this).select('text')
        .transition().duration(200)
        .attr('opacity', 0)

      edgeSelection.attr('stroke', 'rgba(0,0,0,0.06)')
    })

  nodeGroups.append('circle')
    .attr('r', 6)
    .attr('fill', d => d.color)
    .attr('fill-opacity', 0.7)

  nodeGroups.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', -12)
    .attr('fill', '#64748b')
    .attr('font-size', 12)
    .attr('font-family', "'Geist', 'Noto Sans SC', system-ui, sans-serif")
    .attr('opacity', 0)
    .text(d => d.id.length > 16 ? d.id.slice(0, 14) + '...' : d.id)

  simulation.on('tick', () => {
    edgeSelection
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`)
  })

  svgEl.call(zoom.transform, d3.zoomIdentity
    .translate(width.value * 0.05, height.value * 0.05)
    .scale(0.9)
  )
}
</script>

<style scoped>
.node-graph {
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(99, 102, 241, 0.2);
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
}
</style>
