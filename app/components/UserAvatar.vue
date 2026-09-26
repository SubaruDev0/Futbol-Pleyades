<script setup lang="ts">
const props = withDefaults(
  defineProps<{ name?: string | null, src?: string | null, size?: number }>(),
  { name: '', src: null, size: 26 },
)

const initial = computed(() => props.name?.trim().charAt(0).toUpperCase() || '·')
const broken = ref(false)
watch(() => props.src, () => { broken.value = false })
</script>

<template>
  <span class="pl-avatar" :style="{ '--size': `${size}px` }" aria-hidden="true">
    <img v-if="src && !broken" :src="src" alt="" loading="lazy" decoding="async" @error="broken = true">
    <template v-else>{{ initial }}</template>
  </span>
</template>

<style scoped>
.pl-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--size);
  height: var(--size);
  overflow: hidden;
  background: var(--pl-accent);
  color: var(--pl-pitch);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: calc(var(--size) * 0.56);
  font-style: normal;
  line-height: 1;
}

.pl-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
