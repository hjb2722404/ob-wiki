<template>
  <div class="cluster-view graph-fullscreen">
    <nav class="breadcrumb">
      <router-link :to="{ name: 'home' }" class="crumb-link">Graph</router-link>
      <span class="crumb-sep">/</span>
      <span class="crumb-current">{{ clusterLabel }}</span>
    </nav>
    <div class="cluster-stats">
      <span class="stat">{{ nodeCount }} nodes</span>
      <span class="stat-divider"></span>
      <span class="stat">{{ edgeCount }} connections</span>
    </div>
    <NodeGraph :clusterId="clusterId" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import NodeGraph from './NodeGraph.vue'
import { useGraphData } from '../composables/useGraphData.js'

const route = useRoute()
const { graphData, loadGraph } = useGraphData()
const clusterId = computed(() => route.params.clusterId)

const clusterLabel = ref('')
const nodeCount = ref(0)
const edgeCount = ref(0)

onMounted(async () => {
  await loadGraph()
  const cluster = graphData.value?.clusters?.find(c => c.id === clusterId.value)
  clusterLabel.value = cluster?.label || clusterId.value
  nodeCount.value = cluster?.count || 0

  // Count internal edges
  const nodeIds = new Set(
    graphData.value.nodes
      .filter(n => n.cluster === clusterId.value)
      .map(n => n.id)
  )
  edgeCount.value = graphData.value.edges.filter(
    e => nodeIds.has(e.source) && nodeIds.has(e.target)
  ).length
})
</script>

<style scoped>
.cluster-view {
  background: var(--bg-deep);
  position: relative;
}

.breadcrumb {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245, 247, 251, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 15px;
}

.crumb-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s;
}

.crumb-link:hover {
  color: var(--accent);
}

.crumb-sep {
  color: #3a3a42;
}

.crumb-current {
  color: var(--text-primary);
  font-weight: 500;
}

.cluster-stats {
  position: absolute;
  top: 50px;
  left: 24px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
}

.stat-divider {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #3a3a42;
}
</style>
