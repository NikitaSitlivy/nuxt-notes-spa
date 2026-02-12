<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @click.self="$emit('close')">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="head">
          <div class="title">{{ title }}</div>
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
defineProps<{
  open: boolean
  title: string
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<style scoped lang="scss">
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  display: grid;
  place-items: center;
  padding: 16px;
}
.modal {
  width: min(520px, 100%);
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
}
.head {
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
}
.title {
  font-weight: 700;
}
.body {
  padding: 16px;
}
.actions {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
