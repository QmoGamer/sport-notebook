<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
    {{ name.charAt(0) }}
  </span>
</template>
