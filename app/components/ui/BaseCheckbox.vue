<template>
  <label class="checkbox">
    <input
      class="checkbox__native"
      type="checkbox"
      :checked="modelValue"
      @change="onChange"
    />
    <span class="checkbox__icon" aria-hidden="true" />
    <span class="checkbox__label"><slot /></span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const onChange = (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).checked)
</script>

<style scoped lang="scss">
.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-width: 0;
}

.checkbox__native {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.checkbox__icon {
  width: 20px;
  height: 20px;
  border: 1px solid #b6c1df;
  border-radius: 6px;
  background: #fff;
  position: relative;
  flex: 0 0 20px;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.checkbox__icon::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 10px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  left: 6px;
  top: 2px;
  opacity: 0;
}

.checkbox__native:checked + .checkbox__icon {
  background: #2136d6;
  border-color: #2136d6;
}

.checkbox__native:checked + .checkbox__icon::after {
  opacity: 1;
}

.checkbox__native:focus-visible + .checkbox__icon {
  box-shadow: 0 0 0 3px rgba(66, 85, 255, 0.22);
}

.checkbox__label {
  min-width: 0;
  line-height: 1.3;
}
</style>
