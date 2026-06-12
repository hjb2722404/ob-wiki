<template>
  <div class="home-view graph-fullscreen">
    <div class="search-slot">
      <SearchBar />
    </div>
    <ClusterGraph />
  </div>
</template>

<script setup>
import ClusterGraph from './ClusterGraph.vue'
import SearchBar from './SearchBar.vue'
</script>

<style scoped>
.home-view {
  background: var(--bg-deep);
  position: relative;
}

.search-slot {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 16px 24px;
}
</style>
