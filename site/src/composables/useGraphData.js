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
