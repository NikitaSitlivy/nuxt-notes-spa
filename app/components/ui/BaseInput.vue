<template>
  <input
    class="input"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :maxlength="maxlength"
    @input="onInput"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    type?: string
    maxlength?: number
  }>(),
  {
    type: 'text'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
}>()

const onInput = (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value)
</script>

<style scoped lang="scss">
.input {
  width: 100%;
  border: 1px solid #d3d9ea;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.3;
  color: #151e36;
  background: #fff;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.input::placeholder {
  color: #8d96b4;
}

.input:hover {
  border-color: #b8c3e4;
}

.input:focus-visible {
  outline: none;
  border-color: #3c53ee;
  box-shadow: 0 0 0 3px rgba(60, 83, 238, 0.16);
}
</style>
