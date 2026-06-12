<template>
  <div class="detail-view">
    <h1>{{ id }}</h1>
    <p>Detail page will render here.</p>
  </div>
</template>

<script setup>
defineProps({ id: String })
</script>
