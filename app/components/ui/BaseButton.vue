<template>
  <button
    :type="type"
    class="btn"
    :class="[`btn--${resolvedVariant}`, { 'btn--block': block }]"
    :disabled="disabled"
    @click="onClick"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    danger?: boolean
    disabled?: boolean
    block?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    danger: false,
    disabled: false,
    block: false
  }
)

const emit = defineEmits<{
  (e: 'click'): void
}>()

const resolvedVariant = computed(() => (props.danger ? 'danger' : props.variant))

const onClick = () => {
  if (props.disabled) return
  emit('click')
}
</script>

<style scoped lang="scss">
.btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
  transition:
    transform 0.12s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:focus-visible,
.btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(66, 85, 255, 0.22);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  background: #2136d6;
  border-color: #2136d6;
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  background: #1b2db3;
  border-color: #1b2db3;
}

.btn--secondary {
  background: #fff;
  color: #1f2a44;
  border-color: #d3d9ea;
}

.btn--secondary:hover:not(:disabled) {
  background: #f6f8ff;
  border-color: #bbc5e2;
}

.btn--ghost {
  background: transparent;
  border-color: transparent;
  color: #30468e;
}

.btn--ghost:hover:not(:disabled) {
  background: #eef2ff;
}

.btn--danger {
  background: #ca2d2d;
  border-color: #ca2d2d;
  color: #fff;
}

.btn--danger:hover:not(:disabled) {
  background: #ad2222;
  border-color: #ad2222;
}

.btn--block {
  width: 100%;
}
</style>
