<template>
  <div class="page">
    <div class="top">
      <h1 class="title">Notes</h1>
      <BaseButton @click="onCreate">Create</BaseButton>
    </div>

    <div v-if="notes.length === 0" class="empty">
      No notes yet
    </div>

    <div class="grid">
      <div v-for="n in notes" :key="n.id" class="card">
        <div class="cardHead">
          <div class="cardTitle">{{ n.title || 'Untitled' }}</div>
          <div class="cardActions">
            <NuxtLink class="link" :to="`/notes/${n.id}`">Edit</NuxtLink>
            <button class="link danger" @click="askDelete(n.id)">Delete</button>
          </div>
        </div>

        <ul class="preview">
          <li v-for="t in previewTodos(n.todos)" :key="t.id">
            {{ t.done ? '✓' : '•' }} {{ t.text || '...' }}
          </li>
          <li v-if="n.todos.length === 0" class="muted">No todos</li>
        </ul>
      </div>
    </div>

    <BaseModal :open="deleteOpen" title="Delete note?" @close="deleteOpen = false">
      <div>This action cannot be undone.</div>
      <template #actions>
        <BaseButton @click="deleteOpen = false">Cancel</BaseButton>
        <BaseButton danger @click="confirmDelete">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '~/utils/types'

const store = useNotesStore()
const notes = computed(() => store.notes)

const deleteOpen = ref(false)
const deleteId = ref<string | null>(null)

const previewTodos = (todos: Todo[]) => todos.slice(0, 3)

const onCreate = () => navigateTo('/notes/new')

const askDelete = (id: string) => {
  deleteId.value = id
  deleteOpen.value = true
}

const confirmDelete = () => {
  if (!deleteId.value) return
  store.deleteNote(deleteId.value)
  deleteOpen.value = false
  deleteId.value = null
}
</script>

<style scoped lang="scss">
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.title {
  margin: 0;
}
.empty {
  margin-top: 16px;
  padding: 18px;
  border: 1px dashed #d1d5db;
  border-radius: 14px;
}
.grid {
  margin-top: 16px;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px;
  background: #fff;
}
.cardHead {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
}
.cardTitle {
  font-weight: 800;
  word-break: break-word;
}
.cardActions {
  display: inline-flex;
  gap: 10px;
  align-items: center;
}
.link {
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: #111827;
  text-decoration: underline;
  font: inherit;
}
.danger {
  color: #b91c1c;
}
.preview {
  margin: 12px 0 0;
  padding-left: 18px;
}
.muted {
  color: #6b7280;
}
</style>
