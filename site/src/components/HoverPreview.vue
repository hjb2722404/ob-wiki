<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="hover-preview"
      :style="{ top: y + 'px', left: x + 'px' }"
      @click.stop
    >
      <div class="preview-header">
        <span class="preview-title">{{ preview.title }}</span>
        <span class="preview-type" :style="{ color: typeColor }">{{ preview.type }}</span>
      </div>
      <div class="preview-tags" v-if="preview.tags?.length">
        <span v-for="tag in preview.tags.slice(0, 3)" :key="tag" class="preview-tag">{{ tag }}</span>
      </div>
      <p class="preview-summary">{{ preview.summary || 'No summary available' }}</p>
      <div class="preview-action">Click to view details</div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'

const TYPE_COLORS = {
  entity: '#6366f1',
  concept: '#10b981',
  source: '#f59e0b',
  synthesis: '#8b5cf6',
  contradiction: '#ef4444'
}

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const preview = ref({ title: '', type: '', tags: [], summary: '' })

const typeColor = computed(() => TYPE_COLORS[preview.value.type] || '#94a3b8')

function show(nodePreview, event) {
  preview.value = nodePreview
  // Position: offset from mouse, keep in viewport
  const offset = 16
  let px = event.clientX + offset
  let py = event.clientY + offset
  if (px + 280 > window.innerWidth) px = event.clientX - 280 - offset
  if (py + 180 > window.innerHeight) py = event.clientY - 180 - offset
  x.value = px
  y.value = py
  visible.value = true
}

function hide() {
  visible.value = false
}

defineExpose({ show, hide })
</script>

<style scoped>
.hover-preview {
  position: fixed;
  z-index: 9999;
  width: 260px;
  background: var(--bg-surface);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  animation: fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.preview-title {
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-type {
  font-family: 'Geist Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.preview-tags {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}

.preview-tag {
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  color: var(--text-secondary);
  font-family: 'Geist Mono', monospace;
}

.preview-summary {
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.preview-action {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  padding-top: 8px;
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 11px;
  color: var(--accent);
  opacity: 0.7;
}
</style>
