import { ref } from 'vue'
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
