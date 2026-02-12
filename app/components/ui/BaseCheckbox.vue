<template>
  <label class="row">
    <input class="cb" type="checkbox" :checked="modelValue" @change="onChange" />
    <span class="label"><slot /></span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
const onChange = (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).checked)
</script>

<style scoped lang="scss">
.row {
  display: inline-flex;
  gap: 10px;
  align-items: center;
}
.cb {
  width: 18px;
  height: 18px;
}
.label {
  line-height: 1.2;
}
</style>
