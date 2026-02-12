<template>
  <button :type="type" class="btn" :class="{ 'btn--danger': danger }" :disabled="disabled" @click="onClick">
    <slot />
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  type?: 'button' | 'submit'
  danger?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const onClick = () => {
  if (props.disabled) return
  emit('click')
}
</script>


<style scoped lang="scss">
.btn {
  appearance: none;
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  background: #1f2937;
  color: #fff;
  font-weight: 600;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn--danger {
  background: #b91c1c;
}
</style>
