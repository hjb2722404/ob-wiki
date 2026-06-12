<template>
  <div class="detail-view">
    <nav class="breadcrumb">
      <router-link :to="{ name: 'home' }" class="crumb-link">Graph</router-link>
      <span class="crumb-sep">/</span>
      <router-link
        v-if="clusterId"
        :to="{ name: 'cluster', params: { clusterId } }"
        class="crumb-link"
      >{{ clusterLabel }}</router-link>
      <template v-if="clusterId">
        <span class="crumb-sep">/</span>
      </template>
      <span class="crumb-current">{{ pageData?.id || id }}</span>
    </nav>

    <div v-if="loading" class="detail-loading">
      <div class="loading-bar"></div>
    </div>

    <div v-else-if="pageData" class="detail-content">
      <header class="detail-header">
        <h1 class="detail-title">{{ pageData.id }}</h1>
        <div class="detail-meta">
          <span class="meta-type" :style="{ color: typeColor }">{{ pageData.type }}</span>
          <span v-for="tag in (pageData.frontmatter.tags || []).slice(0, 4)" :key="tag" class="meta-tag">
            {{ tag }}
          </span>
        </div>
      </header>

      <article
        class="detail-body"
        ref="bodyRef"
        v-html="pageData.html"
        @click="handleLinkClick"
        @mouseover="handleLinkHover"
        @mouseout="handleLinkLeave"
      />

      <footer class="detail-links" v-if="allLinks.length">
        <div class="links-section-title">Related entries</div>
        <div class="links-grid">
          <router-link
            v-for="link in allLinks"
            :key="link"
            :to="{ name: 'page', params: { id: link } }"
            class="link-pill"
          >
            {{ link }}
          </router-link>
        </div>
      </footer>
    </div>

    <div v-else class="detail-error">
      <span>Page not found</span>
    </div>

    <HoverPreview ref="hoverPreview" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGraphData } from '../composables/useGraphData.js'
import HoverPreview from './HoverPreview.vue'

const TYPE_COLORS = {
  entity: '#6366f1',
  concept: '#10b981',
  source: '#f59e0b',
  synthesis: '#8b5cf6',
  contradiction: '#ef4444'
}

const route = useRoute()
const router = useRouter()
const { graphData, loadGraph, loadPage } = useGraphData()

const props = defineProps({ id: String })

const pageData = ref(null)
const loading = ref(true)
const bodyRef = ref(null)
const hoverPreview = ref(null)

const clusterId = computed(() => {
  if (!graphData.value) return null
  const node = graphData.value.nodes.find(n => n.id === props.id)
  return node?.cluster || null
})

const clusterLabel = computed(() => {
  if (!clusterId.value || !graphData.value) return ''
  const cluster = graphData.value.clusters.find(c => c.id === clusterId.value)
  return cluster?.label || clusterId.value
})

const typeColor = computed(() =>
  TYPE_COLORS[pageData.value?.type] || '#94a3b8'
)

const allLinks = computed(() => {
  if (!pageData.value) return []
  const links = new Set([
    ...(pageData.value.links || []),
    ...(pageData.value.backlinks || [])
  ])
  return [...links].slice(0, 30)
})

let hoverTimer = null

async function loadContent() {
  loading.value = true
  try {
    await loadGraph()
    pageData.value = await loadPage(props.id)
  } catch (e) {
    pageData.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadContent)
watch(() => props.id, loadContent)

function handleLinkClick(event) {
  const link = event.target.closest('a.wiki-link')
  if (!link) return
  event.preventDefault()
  const target = link.getAttribute('data-target')
  if (target) {
    router.push({ name: 'page', params: { id: target } })
  }
}

function handleLinkHover(event) {
  const link = event.target.closest('a.wiki-link')
  if (!link || !graphData.value) return

  clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    const target = link.getAttribute('data-target')
    const node = graphData.value.nodes.find(n => n.id === target)
    if (node?.preview && hoverPreview.value) {
      hoverPreview.value.show({
        ...node.preview,
        type: node.type
      }, event)
    }
  }, 200)
}

function handleLinkLeave(event) {
  clearTimeout(hoverTimer)
  if (hoverPreview.value) {
    hoverPreview.value.hide()
  }
}
</script>

<style scoped>
.detail-view {
  min-height: 100vh;
  background: var(--bg-deep);
  color: var(--text-primary);
}

.breadcrumb {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245, 247, 251, 0.92);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(12px);
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

.detail-loading {
  max-width: 720px;
  margin: 80px auto 0;
  padding: 0 24px;
}

.loading-bar {
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  border-radius: 2px;
  animation: shimmer 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.detail-content {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.detail-header {
  margin-bottom: 36px;
}

.detail-title {
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 34px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.meta-type {
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.meta-tag {
  background: rgba(0, 0, 0, 0.04);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary);
  font-family: 'Geist Mono', monospace;
}

.detail-body {
  font-family: 'Noto Sans SC', system-ui, sans-serif;
  font-size: 17px;
  line-height: 1.8;
  color: var(--text-primary);
}

.detail-body :deep(h2) {
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 32px 0 16px;
  letter-spacing: -0.01em;
}

.detail-body :deep(h3) {
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 24px 0 12px;
}

.detail-body :deep(p) {
  margin-bottom: 16px;
}

.detail-body :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

.detail-body :deep(em) {
  color: var(--text-secondary);
}

.detail-body :deep(ul),
.detail-body :deep(ol) {
  margin-bottom: 16px;
  padding-left: 24px;
}

.detail-body :deep(li) {
  margin-bottom: 6px;
}

.detail-body :deep(a.wiki-link) {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px dashed rgba(99, 102, 241, 0.3);
  transition: border-color 0.15s;
}

.detail-body :deep(a.wiki-link:hover) {
  border-bottom-color: var(--accent);
}

.detail-links {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.links-section-title {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.links-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.link-pill {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.04);
  padding: 5px 12px;
  border-radius: 6px;
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.link-pill:hover {
  background: rgba(99, 102, 241, 0.06);
  border-color: rgba(99, 102, 241, 0.15);
  color: #7dd3c8;
}

.detail-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  color: #ef4444;
  font-family: 'Geist', system-ui, sans-serif;
  font-size: 14px;
}
</style>
