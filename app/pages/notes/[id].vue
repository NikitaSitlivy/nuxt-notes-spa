<template>
  <div class="page">
    <header class="top">
      <button class="back" type="button" @click="onBack">← К списку заметок</button>

      <div class="actions" v-if="isReady">
        <BaseButton variant="secondary" :disabled="!canUndo" @click="undo">Отменить (Ctrl+Z)</BaseButton>
        <BaseButton variant="secondary" :disabled="!canRedo" @click="redo">Повторить (Ctrl+Shift+Z)</BaseButton>
        <BaseButton v-if="!isNew" danger @click="askDelete">Удалить</BaseButton>
      </div>
    </header>

    <section v-if="!isReady" class="empty">
      <h1 class="empty__title">Заметка не найдена</h1>
      <p class="empty__text">Запрошенная заметка была удалена или отсутствует.</p>
      <BaseButton @click="navigateTo('/')">Назад</BaseButton>
    </section>

    <section v-else class="editor">
      <div class="block">
        <div class="label">Название</div>
        <BaseInput :model-value="draft.title" @update:modelValue="setTitle" placeholder="Введите название" />
      </div>

      <div class="block">
        <div class="line">
          <div class="label">Список задач</div>
          <BaseButton variant="secondary" @click="addTodo">Добавить пункт</BaseButton>
        </div>

        <div class="todoHint">Чекбокс «Готово» отмечает выполнение пункта.</div>

        <div class="todos">
          <div v-for="t in draft.todos" :key="t.id" class="todo">
            <BaseCheckbox class="todoToggle" :model-value="t.done" @update:modelValue="(v) => setTodoDone(t.id, v)">
              Готово
            </BaseCheckbox>

            <BaseInput
              :model-value="t.text"
              :class="{ todoInputDone: t.done }"
              @update:modelValue="(v) => setTodoText(t.id, v)"
              placeholder="Текст задачи"
            />

            <button class="iconBtn" type="button" aria-label="Удалить пункт" @click="removeTodo(t.id)">
              ×
            </button>
          </div>
        </div>

        <p v-if="draft.todos.length === 0" class="muted">Пока нет задач.</p>
      </div>

      <footer class="footer">
        <BaseButton v-if="!isNew && hasUnsaved" variant="secondary" @click="askCancel">Отменить редактирование</BaseButton>
        <BaseButton :disabled="!hasUnsaved" @click="save">Сохранить изменения</BaseButton>
      </footer>
    </section>

    <BaseModal :open="cancelOpen" title="Отменить редактирование?" @close="onCancelModalClose">
      <div>Все несохраненные изменения будут потеряны.</div>
      <template #actions>
        <BaseButton variant="secondary" @click="onCancelModalClose">Продолжить редактирование</BaseButton>
        <BaseButton danger @click="confirmCancel">Отменить</BaseButton>
      </template>
    </BaseModal>

    <BaseModal :open="deleteOpen" title="Удалить заметку?" @close="deleteOpen = false">
      <div>Действие необратимо. Заметка будет удалена.</div>
      <template #actions>
        <BaseButton variant="secondary" @click="deleteOpen = false">Отмена</BaseButton>
        <BaseButton danger @click="confirmDelete">Удалить</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '~/utils/types'
import { createId } from '~/utils/id'
import { deepClone } from '~/utils/clone'
import { isEqual } from '~/utils/equal'

const INPUT_MERGE_MS = 500

const store = useNotesStore()
const route = useRoute()
const id = computed(() => String(route.params.id || ''))

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

const baseline = ref<Note | null>(null)
const cancelOpen = ref(false)
const deleteOpen = ref(false)
const pendingRoute = ref<string | null>(null)
const allowRouteLeaveOnce = ref(false)

const past = ref<Note[]>([])
const future = ref<Note[]>([])
const HISTORY_LIMIT = 150

const lastInputKey = ref<string | null>(null)
const lastInputAt = ref(0)

const canUndo = computed(() => past.value.length > 0)
const canRedo = computed(() => future.value.length > 0)

const hasUnsaved = computed(() => {
  if (!baseline.value) return false
  return !isEqual(draft.value, baseline.value)
})

const resetInputGrouping = () => {
  lastInputKey.value = null
  lastInputAt.value = 0
}

const recordHistory = () => {
  const last = past.value[past.value.length - 1]
  if (last && isEqual(last, draft.value)) return
  past.value.push(deepClone(draft.value))
  if (past.value.length > HISTORY_LIMIT) past.value.shift()
  future.value = []
}

const recordInputHistory = (key: string) => {
  const now = Date.now()
  const shouldCreateStep =
    lastInputKey.value !== key || now - lastInputAt.value > INPUT_MERGE_MS || past.value.length === 0

  if (shouldCreateStep) recordHistory()

  lastInputKey.value = key
  lastInputAt.value = now
}

const undo = () => {
  const prev = past.value.pop()
  if (!prev) return
  future.value.push(deepClone(draft.value))
  draft.value = prev
  resetInputGrouping()
}

const redo = () => {
  const next = future.value.pop()
  if (!next) return
  past.value.push(deepClone(draft.value))
  draft.value = next
  resetInputGrouping()
}

const loadDraft = () => {
  past.value = []
  future.value = []
  resetInputGrouping()

  if (isNew.value) {
    const now = Date.now()
    const empty: Note = {
      id: '',
      title: '',
      todos: [],
      createdAt: now,
      updatedAt: now
    }
    draft.value = deepClone(empty)
    baseline.value = deepClone(empty)
    return
  }

  if (!note.value) return
  draft.value = deepClone(note.value)
  baseline.value = deepClone(note.value)
}

watch([id, note], loadDraft, { immediate: true })

const setTitle = (title: string) => {
  if (title === draft.value.title) return
  recordInputHistory('title')
  draft.value.title = title
}

const addTodo = () => {
  resetInputGrouping()
  recordHistory()
  draft.value.todos.push({ id: createId(), text: '', done: false })
}

const removeTodo = (todoId: string) => {
  const idx = draft.value.todos.findIndex((t) => t.id === todoId)
  if (idx === -1) return
  resetInputGrouping()
  recordHistory()
  draft.value.todos.splice(idx, 1)
}

const setTodoText = (todoId: string, text: string) => {
  const todo = draft.value.todos.find((x) => x.id === todoId)
  if (!todo || todo.text === text) return
  recordInputHistory(`todo-text:${todoId}`)
  todo.text = text
}

const setTodoDone = (todoId: string, done: boolean) => {
  const todo = draft.value.todos.find((x) => x.id === todoId)
  if (!todo || todo.done === done) return
  resetInputGrouping()
  recordHistory()
  todo.done = done
}

const save = () => {
  if (!isReady.value) return

  if (isNew.value) {
    const newId = store.createNote({
      title: draft.value.title,
      todos: draft.value.todos,
      createdAt: draft.value.createdAt
    })

    const created = store.getById(newId)
    if (created) {
      draft.value = deepClone(created)
      baseline.value = deepClone(created)
    }

    past.value = []
    future.value = []
    resetInputGrouping()
    navigateTo(`/notes/${newId}`)
    return
  }

  const saved = {
    ...deepClone(draft.value),
    updatedAt: Date.now()
  }

  store.updateNote(saved)
  draft.value = deepClone(saved)
  baseline.value = deepClone(saved)
  past.value = []
  future.value = []
  resetInputGrouping()
}

const onCancelModalClose = () => {
  cancelOpen.value = false
  pendingRoute.value = null
}

const askCancel = () => {
  pendingRoute.value = '/'
  cancelOpen.value = true
}

const onBack = () => {
  if (!hasUnsaved.value) {
    allowRouteLeaveOnce.value = true
    navigateTo('/')
    return
  }

  askCancel()
}

const confirmCancel = () => {
  const target = pendingRoute.value || '/'
  cancelOpen.value = false
  pendingRoute.value = null
  allowRouteLeaveOnce.value = true
  navigateTo(target)
}

const askDelete = () => {
  if (isNew.value) {
    allowRouteLeaveOnce.value = true
    navigateTo('/')
    return
  }
  deleteOpen.value = true
}

const confirmDelete = () => {
  if (!isNew.value) store.deleteNote(id.value)
  deleteOpen.value = false
  allowRouteLeaveOnce.value = true
  navigateTo('/')
}

onBeforeRouteLeave((to, _from, next) => {
  if (allowRouteLeaveOnce.value) {
    allowRouteLeaveOnce.value = false
    next()
    return
  }

  if (!hasUnsaved.value) {
    next()
    return
  }

  pendingRoute.value = to.fullPath
  cancelOpen.value = true
  next(false)
})

const onKeydown = (e: KeyboardEvent) => {
  if (!(e.ctrlKey || e.metaKey)) return
  const key = e.key.toLowerCase()

  if ((key === 'z' && e.shiftKey) || key === 'y') {
    e.preventDefault()
    redo()
    return
  }

  if (key === 'z') {
    e.preventDefault()
    undo()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped lang="scss">
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.back {
  color: #2f448b;
  text-decoration: underline;
  text-underline-offset: 2px;
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.actions {
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
}

.empty {
  margin-top: 18px;
  border: 1px dashed #ccd5ef;
  border-radius: 16px;
  background: #fff;
  padding: 22px;
  max-width: 560px;
  display: grid;
  gap: 10px;
}

.empty__title {
  margin: 0;
}

.empty__text {
  margin: 0;
  color: #6f7a9f;
}

.editor {
  margin-top: 16px;
  background: #fff;
  border: 1px solid #d7dff3;
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 16px 36px rgba(19, 32, 68, 0.08);
}

.block + .block {
  margin-top: 18px;
}

.label {
  margin-bottom: 8px;
  font-weight: 700;
  color: #1a274a;
}

.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.todoHint {
  color: #6a7598;
  font-size: 13px;
}

.todos {
  margin-top: 10px;
  display: grid;
  gap: 10px;
}

.todo {
  display: grid;
  grid-template-columns: minmax(120px, auto) 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid #e3e9fb;
  border-radius: 14px;
  background: #fbfcff;
}

.todoToggle {
  min-width: 0;
}

.todoInputDone :deep(.input) {
  text-decoration: line-through;
  color: #7a83a0;
}

.iconBtn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #d3dcf5;
  background: #fff;
  color: #32437c;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.iconBtn:hover {
  background: #f2f6ff;
}

.muted {
  margin: 10px 0 0;
  color: #7782a8;
}

.footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 680px) {
  .editor {
    padding: 14px;
    border-radius: 16px;
  }

  .todo {
    grid-template-columns: 1fr;
  }

  .iconBtn {
    justify-self: end;
  }
}
</style>



