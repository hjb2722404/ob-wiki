<template>
  <div class="search-bar">
    <input
      type="text"
      placeholder="Search entries..."
      class="search-input"
      v-model="query"
      @input="onInput"
      @keydown.escape="results = []"
    />
    <div v-if="results.length" class="search-results">
      <div
        v-for="item in results"
        :key="item.id"
        class="search-item"
        @click="goToPage(item.id)"
      >
        <span class="search-item-title">{{ item.id }}</span>
        <span class="search-item-type">{{ item.type }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSearch } from '../composables/useSearch.js'

const router = useRouter()
const { results, initIndex, search } = useSearch()
const query = ref('')

onMounted(() => initIndex())

let debounceTimer = null
function onInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    search(query.value)
  }, 300)
}

function goToPage(id) {
  results.value = []
  query.value = ''
  router.push({ name: 'page', params: { id } })
}
</script>

<style scoped>
.search-bar {
  position: relative;
  max-width: 420px;
  margin: 0 auto;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              background 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: rgba(125, 211, 200, 0.25);
  background: rgba(255, 255, 255, 0.06);
}

.search-results {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-surface);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  max-height: 320px;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.search-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.search-item-title {
  font-family: 'Geist', 'Noto Sans SC', system-ui, sans-serif;
  font-size: 15px;
  color: var(--text-primary);
}

.search-item-type {
  font-family: 'Geist Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
