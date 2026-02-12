<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true" :aria-label="title">
        <div class="head">
          <div class="title">{{ title }}</div>
          <button class="close" type="button" aria-label="Close" @click="emit('close')">×</button>
        </div>

        <div class="body">
          <slot />
        </div>

        <div class="actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const onKeydown = (e: KeyboardEvent) => {
  if (!props.open) return
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped lang="scss">
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 24, 52, 0.6);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 200;
}

.modal {
  width: min(540px, 100%);
  border-radius: 18px;
  border: 1px solid #e0e6fa;
  background: #fff;
  box-shadow: 0 24px 50px rgba(20, 30, 66, 0.25);
  overflow: hidden;
}

.head {
  padding: 14px 16px;
  border-bottom: 1px solid #e5ebfb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.title {
  font-weight: 700;
  color: #1b2648;
}

.close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #d4ddf5;
  background: #f7f9ff;
  color: #2a3b78;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.close:hover {
  background: #edf1ff;
}

.body {
  padding: 16px;
  color: #2f3959;
}

.actions {
  padding: 12px 16px 16px;
  border-top: 1px solid #e5ebfb;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
