<template>
  <div class="page" v-if="isReady">
    <div class="top">
      <NuxtLink class="back" to="/">← Back</NuxtLink>

      <div class="actions">
        <BaseButton :disabled="!canUndo" @click="store.undo()">Undo</BaseButton>
        <BaseButton :disabled="!canRedo" @click="store.redo()">Redo</BaseButton>
        <BaseButton danger @click="askDelete">Delete</BaseButton>
      </div>
    </div>

    <div class="block">
      <div class="label">Title</div>
      <BaseInput v-model="draft.title" placeholder="Note title" />
    </div>

    <div class="block">
      <div class="row">
        <div class="label">Todos</div>
        <BaseButton @click="addTodo">Add</BaseButton>
      </div>

      <div class="todos">
        <div v-for="t in draft.todos" :key="t.id" class="todo">
          <BaseCheckbox v-model="t.done" />
          <BaseInput v-model="t.text" placeholder="Todo text" />
          <button class="iconBtn" @click="removeTodo(t.id)">✕</button>
        </div>
      </div>
    </div>

    <div class="footer">
      <BaseButton @click="askCancel">Cancel</BaseButton>
      <BaseButton @click="save">Save</BaseButton>
    </div>

    <BaseModal :open="cancelOpen" title="Cancel editing?" @close="cancelOpen = false">
      <div>All unsaved changes will be lost.</div>
      <template #actions>
        <BaseButton @click="cancelOpen = false">Stay</BaseButton>
        <BaseButton danger @click="confirmCancel">Cancel editing</BaseButton>
      </template>
    </BaseModal>

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
import type { Note } from '~/utils/types'
import { createId } from '~/utils/id'
import { deepClone } from '~/utils/clone'

const store = useNotesStore()
const route = useRoute()
const id = computed(() => String(route.params.id))

const isNew = computed(() => id.value === 'new')
const note = computed(() => (isNew.value ? null : store.getById(id.value)))
const isReady = computed(() => isNew.value || !!note.value)

const draft = ref<Note>({
  id: '',
  title: '',
  todos: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
})

const cancelOpen = ref(false)
const deleteOpen = ref(false)

const canUndo = computed(() => store.past.length > 0)
const canRedo = computed(() => store.future.length > 0)

const loadDraft = () => {
  if (id.value === 'new') {
    draft.value = {
      id: '',
      title: '',
      todos: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    return
  }
  if (!note.value) return
  draft.value = deepClone(note.value)
}

watch([id, note], loadDraft, { immediate: true })

const addTodo = () => {
  draft.value.todos.push({ id: createId(), text: '', done: false })
}

const removeTodo = (todoId: string) => {
  const idx = draft.value.todos.findIndex((t) => t.id === todoId)
  if (idx === -1) return
  draft.value.todos.splice(idx, 1)
}

const save = () => {
  if (id.value === 'new') {
    const newId = store.createNote()
    store.updateNote({ ...draft.value, id: newId })
    navigateTo(`/notes/${newId}`)
    return
  }
  store.updateNote(draft.value)
  navigateTo('/')
}

const askCancel = () => {
  cancelOpen.value = true
}

const confirmCancel = () => {
  cancelOpen.value = false
  navigateTo('/')
}

const askDelete = () => {
  deleteOpen.value = true
}

const confirmDelete = () => {
  if (id.value !== 'new') store.deleteNote(id.value)
  deleteOpen.value = false
  navigateTo('/')
}

const onKeydown = (e: KeyboardEvent) => {
  if (!(e.ctrlKey || e.metaKey)) return
  if (e.key.toLowerCase() === 'z' && e.shiftKey) {
    e.preventDefault()
    store.redo()
    return
  }
  if (e.key.toLowerCase() === 'z') {
    e.preventDefault()
    store.undo()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped lang="scss">
.page {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.back {
  color: #111827;
  text-decoration: underline;
}
.actions {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
}
.block {
  margin-top: 16px;
}
.label {
  font-weight: 700;
  margin-bottom: 8px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.todos {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}
.todo {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
}
.iconBtn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
}
.footer {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
