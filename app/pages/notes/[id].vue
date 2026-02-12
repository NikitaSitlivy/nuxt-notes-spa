<template>
  <div class="page">
    <div class="hero">
      <header class="top">
        <button class="back" type="button" @click="onBack">← К списку заметок</button>

        <div class="actions" v-if="isReady">
          <BaseButton v-if="!isNew" danger @click="askDelete">Удалить</BaseButton>
          <BaseButton v-else danger class="actions__placeholder" disabled aria-hidden="true" tabindex="-1">Удалить</BaseButton>
        </div>
      </header>
    </div>

    <section v-if="!isReady" class="empty">
      <h1 class="empty__title">Заметка не найдена</h1>
      <p class="empty__text">Запрошенная заметка была удалена или отсутствует.</p>
      <BaseButton @click="navigateTo('/')">Назад</BaseButton>
    </section>

    <section v-else class="editor">
      <div class="historyPanel">
        <div class="historyPanel__text">
          <div class="historyPanel__title">История изменений</div>
          <div class="historyPanel__hint">«Отменить» отменяет последнее изменение. «Повторить» возвращает действие, которое вы только что отменили.</div>
        </div>
        <div class="historyPanel__actions">
          <BaseButton variant="secondary" :disabled="!canUndo" title="Ctrl+Z" @click="undo">Отменить</BaseButton>
          <BaseButton variant="secondary" :disabled="!canRedo" title="Ctrl+Shift+Z / Ctrl+Y" @click="redo">Повторить</BaseButton>
        </div>
      </div>

      <div class="block">
        <div class="label">Название</div>
        <BaseInput class="titleInput" :model-value="draft.title" @update:modelValue="setTitle" placeholder="Введите название" />
      </div>

      <div class="block">
        <div class="line">
          <div class="label">Список задач</div>
          <BaseButton variant="secondary" @click="addTodo">Добавить пункт</BaseButton>
        </div>

        <div class="todoHint">Чекбокс «Готово» отмечает выполнение пункта.</div>

        <TransitionGroup name="todoList" tag="div" class="todos">
          <div v-for="t in draft.todos" :key="t.id" class="todo">
            <BaseCheckbox class="todoToggle" :model-value="t.done" @update:modelValue="(v) => setTodoDone(t.id, v)">
              Готово
            </BaseCheckbox>

            <textarea
              class="todoTextArea"
              :value="t.text"
              :class="{ todoTextAreaDone: t.done }"
              rows="1"
              placeholder="Текст задачи"
              @focus="onTodoTextareaFocus"
              @input="(e) => onTodoInput(t.id, e)"
            />

            <button class="iconBtn" type="button" aria-label="Удалить пункт" @click="askRemoveTodo(t.id)">
              ×
            </button>
          </div>
        </TransitionGroup>

        <p v-if="draft.todos.length === 0" class="muted">Пока нет задач.</p>
      </div>

      <footer class="footer" :class="{ 'footer--sticky': isReady }">
        <div class="saveState" :class="{ 'saveState--visible': saveMessageVisible }" aria-live="polite">{{ saveMessage }}</div>

        <div class="footer__actions">
          <BaseButton v-if="!isNew && hasUnsaved" variant="secondary" @click="askCancel">Отменить редактирование</BaseButton>
          <BaseButton :disabled="!hasUnsaved" @click="save">
            {{ hasUnsaved ? 'Сохранить изменения' : 'Сохранено' }}
          </BaseButton>
        </div>
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

    <BaseModal :open="todoDeleteOpen" title="Удалить пункт?" @close="onTodoDeleteClose">
      <div>Пункт будет удален из списка задач.</div>
      <template #actions>
        <BaseButton variant="secondary" @click="onTodoDeleteClose">Отмена</BaseButton>
        <BaseButton danger @click="confirmRemoveTodo">Удалить</BaseButton>
      </template>
    </BaseModal>

    <BaseModal :open="undoDeleteOpen" title="Отменить действие?" @close="onUndoDeleteClose">
      <div>
        После отмены будет удален
        {{ undoDeleteCount }} {{ pluralizeTodos(undoDeleteCount) }}.
      </div>
      <template #actions>
        <BaseButton variant="secondary" @click="onUndoDeleteClose">Оставить как есть</BaseButton>
        <BaseButton danger @click="confirmUndoDelete">Отменить действие</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import type { Note } from '~/utils/types'
import { createId } from '~/utils/id'
import { deepClone } from '~/utils/clone'
import { isEqual } from '~/utils/equal'

definePageMeta({
  key: (route) => String(route.name ?? 'notes-id')
})

const INPUT_MERGE_MS = 500
const SAVED_MESSAGE_MS = 1700

const store = useNotesStore()
const router = useRouter()
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
const todoDeleteOpen = ref(false)
const todoDeleteId = ref<string | null>(null)
const undoDeleteOpen = ref(false)
const undoDeleteCount = ref(0)
const pendingRoute = ref<string | null>(null)
const allowRouteLeaveOnce = ref(false)
const preserveHistoryOnNextLoad = ref(false)

const past = ref<Note[]>([])
const future = ref<Note[]>([])
const HISTORY_LIMIT = 150

const lastInputKey = ref<string | null>(null)
const lastInputAt = ref(0)

const saveMessage = ref('')
const saveMessageVisible = ref(false)
const lastSavedAt = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null

const canUndo = computed(() => past.value.length > 0)
const canRedo = computed(() => future.value.length > 0)

const pluralizeTodos = (count: number) => {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'пункт'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'пункта'
  return 'пунктов'
}

const hasUnsaved = computed(() => {
  if (!baseline.value) return false
  return !isEqual(draft.value, baseline.value)
})

watch(hasUnsaved, (value) => {
  if (value) {
    saveMessageVisible.value = false
  }
})

const showSavedMessage = () => {
  lastSavedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  saveMessage.value = `Изменения сохранены • ${lastSavedAt.value}`
  saveMessageVisible.value = true

  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveMessageVisible.value = false
    saveTimer = null
  }, SAVED_MESSAGE_MS)
}

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
  const prev = past.value[past.value.length - 1]
  if (!prev) return

  const removedCount = getRemovedTodosCount(draft.value, prev)
  if (removedCount > 0) {
    undoDeleteCount.value = removedCount
    undoDeleteOpen.value = true
    return
  }

  applyUndo()
}

const applyUndo = () => {
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

const getRemovedTodosCount = (from: Note, to: Note) => {
  const toIds = new Set(to.todos.map((t) => t.id))
  return from.todos.reduce((count, t) => count + Number(!toIds.has(t.id)), 0)
}

const onUndoDeleteClose = () => {
  undoDeleteOpen.value = false
  undoDeleteCount.value = 0
}

const confirmUndoDelete = () => {
  onUndoDeleteClose()
  applyUndo()
}

const loadDraft = () => {
  // After save we already have the same draft/baseline in memory.
  // Skip one reactive reload pass to avoid visible "page refresh" effect.
  if (
    preserveHistoryOnNextLoad.value &&
    !isNew.value &&
    !!note.value &&
    !!baseline.value &&
    isEqual(draft.value, note.value)
  ) {
    preserveHistoryOnNextLoad.value = false
    return
  }

  if (preserveHistoryOnNextLoad.value) {
    preserveHistoryOnNextLoad.value = false
  } else {
    past.value = []
    future.value = []
    resetInputGrouping()
  }

  saveMessageVisible.value = false

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

const askRemoveTodo = (todoId: string) => {
  todoDeleteId.value = todoId
  todoDeleteOpen.value = true
}

const onTodoDeleteClose = () => {
  todoDeleteOpen.value = false
  todoDeleteId.value = null
}

const confirmRemoveTodo = () => {
  if (!todoDeleteId.value) return
  const todoId = todoDeleteId.value
  const idx = draft.value.todos.findIndex((t) => t.id === todoId)
  if (idx === -1) {
    onTodoDeleteClose()
    return
  }
  resetInputGrouping()
  recordHistory()
  draft.value.todos.splice(idx, 1)
  onTodoDeleteClose()
}

const setTodoText = (todoId: string, text: string) => {
  const todo = draft.value.todos.find((x) => x.id === todoId)
  if (!todo || todo.text === text) return
  recordInputHistory(`todo-text:${todoId}`)
  todo.text = text
}

const autoGrowTodoTextarea = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

const onTodoTextareaFocus = (e: FocusEvent) => {
  autoGrowTodoTextarea(e.target as HTMLTextAreaElement)
}

const onTodoInput = (todoId: string, e: Event) => {
  const el = e.target as HTMLTextAreaElement
  autoGrowTodoTextarea(el)
  setTodoText(todoId, el.value)
}

const setTodoDone = (todoId: string, done: boolean) => {
  const todo = draft.value.todos.find((x) => x.id === todoId)
  if (!todo || todo.done === done) return
  resetInputGrouping()
  recordHistory()
  todo.done = done
}

const persistSave = async () => {
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

    showSavedMessage()
    preserveHistoryOnNextLoad.value = true
    await router.replace(`/notes/${newId}`)
    return
  }

  const saved = {
    ...deepClone(draft.value),
    updatedAt: Date.now()
  }

  preserveHistoryOnNextLoad.value = true
  store.updateNote(saved)
  draft.value = deepClone(saved)
  baseline.value = deepClone(saved)
  showSavedMessage()
}

const save = async () => {
  if (!isReady.value) return
  await persistSave()
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
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (saveTimer) clearTimeout(saveTimer)
})

watch(
  () => draft.value.todos.map((t) => `${t.id}:${t.text}`).join('|'),
  async () => {
    await nextTick()
    const nodes = document.querySelectorAll<HTMLTextAreaElement>('.todoTextArea')
    nodes.forEach(autoGrowTodoTextarea)
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 22px 14px 96px;
}

.hero {
  padding: 12px;
  border-radius: 24px;
  border: 1px solid #d9e4fb;
  background:
    radial-gradient(500px 100px at -10% 10%, rgba(63, 107, 255, 0.2), transparent),
    radial-gradient(400px 90px at 115% 35%, rgba(62, 196, 250, 0.18), transparent),
    linear-gradient(180deg, rgba(245, 249, 255, 0.9), rgba(236, 242, 255, 0.86));
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
  min-height: 42px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #ccd8f6;
  border-radius: 11px;
  background: #f5f8ff;
  color: #213772;
  padding: 7px 11px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.16s ease;
}

.back:hover {
  background: #eaf1ff;
  border-color: #b9caf5;
  transform: translateY(-1px);
}

.back:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(52, 85, 245, 0.22);
  border-radius: 6px;
}

.actions {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  min-width: 118px;
}

.actions__placeholder {
  visibility: hidden;
  pointer-events: none;
}

.empty {
  margin-top: 24px;
  border: 1px dashed #c8d4f5;
  border-radius: 20px;
  background: linear-gradient(180deg, #fff, #f8fbff);
  padding: 18px;
  max-width: 560px;
  display: grid;
  gap: 12px;
  box-shadow: 0 14px 34px rgba(21, 36, 71, 0.08);
}

.empty__title {
  margin: 0;
}

.empty__text {
  margin: 0;
  color: #5d688b;
}

.editor {
  margin-top: 14px;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  border: 1px solid #d2def8;
  border-radius: 18px;
  padding: 14px;
  box-shadow:
    0 20px 40px rgba(19, 32, 68, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: grid;
  gap: 12px;
  animation: page-rise 0.45s ease both;
}

.historyPanel {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: 1px solid #dbe4fb;
  border-radius: 16px;
  background: linear-gradient(180deg, #f7faff, #f2f6ff);
}

.historyPanel__text {
  min-width: 0;
}

.historyPanel__title {
  font-size: 14px;
  font-weight: 700;
  color: #21356d;
}

.historyPanel__hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: #5f6b90;
  max-width: 62ch;
}

.historyPanel__actions {
  display: inline-flex;
  gap: 8px;
  flex-wrap: nowrap;
  flex: 0 0 auto;
}

.block + .block {
  margin-top: 0;
}

.label {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1a274a;
}

.block {
  border: 1px solid #dce5fa;
  background: linear-gradient(180deg, #ffffff, #f9fbff);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 8px 20px rgba(24, 36, 71, 0.05);
}

.titleInput :deep(.input) {
  min-height: 44px;
  font-size: 15px;
  font-weight: 600;
}

.line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.todoHint {
  margin-top: 2px;
  color: #56618a;
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
  border: 1px solid #dbe4fb;
  border-radius: 15px;
  background: linear-gradient(180deg, #ffffff, #f6f9ff);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.todo:hover {
  border-color: #bcccf6;
  box-shadow: 0 8px 18px rgba(37, 59, 115, 0.08);
  transform: translateY(-1px);
}

.todoToggle {
  min-width: 0;
  align-self: center;
}

.todoToggle :deep(.checkbox__label) {
  white-space: nowrap;
}

.todoTextArea {
  width: 100%;
  min-height: 42px;
  resize: none;
  border: 1px solid #d3d9ea;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.45;
  color: #151e36;
  background: #fff;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
  overflow: hidden;
}

.todoTextArea::placeholder {
  color: #8d96b4;
}

.todoTextArea:hover {
  border-color: #b8c3e4;
}

.todoTextArea:focus-visible,
.todoTextArea:focus {
  outline: none;
  border-color: #3c53ee;
  box-shadow: 0 0 0 3px rgba(60, 83, 238, 0.16);
}

.todoTextAreaDone {
  border-color: #bcdcc9;
  background: #f6fff9;
}

.iconBtn {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  border: 1px solid #efcaca;
  background: #fff6f6;
  color: #b03a3a;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    transform 0.12s ease;
}

.iconBtn:hover {
  background: #ffecec;
  border-color: #e6b1b1;
  color: #962b2b;
  transform: translateY(-1px);
}

.iconBtn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(202, 45, 45, 0.22);
}

.muted {
  margin: 10px 0 0;
  padding: 12px;
  border-radius: 14px;
  border: 1px dashed #ced9f6;
  background: #f7faff;
  color: #5f6a8d;
}

.footer {
  margin-top: 2px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.footer__actions {
  display: inline-flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
}

.saveState {
  color: #1f7142;
  font-size: 13px;
  font-weight: 600;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  transform: translateY(4px);
}

.saveState--visible {
  opacity: 1;
  transform: translateY(0);
}

.todoList-enter-active,
.todoList-leave-active {
  transition: all 0.24s ease;
}

.todoList-enter-from,
.todoList-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.todoList-move {
  transition: transform 0.24s ease;
}

@media (max-width: 680px) {
  .hero {
    padding: 8px;
    border-radius: 18px;
  }

  .editor {
    padding: 12px;
    border-radius: 16px;
  }

  .historyPanel {
    flex-direction: column;
    align-items: stretch;
  }

  .historyPanel__actions :deep(.btn) {
    width: 100%;
  }

  .top {
    align-items: stretch;
  }

  .actions {
    width: 100%;
    min-width: 0;
  }

  .actions :deep(.btn) {
    flex: 1 1 auto;
  }

  .line :deep(.btn) {
    width: 100%;
  }

  .historyPanel__actions {
    flex-wrap: wrap;
  }

  .todo {
    grid-template-columns: 1fr;
  }

  .iconBtn {
    justify-self: end;
  }

  .footer--sticky {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 12px 16px 12px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.93);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    border-top: 1px solid #dde4f7;
    box-shadow: 0 -8px 24px rgba(20, 31, 64, 0.08);
    z-index: 80;
  }

  .saveState {
    order: 2;
    width: 100%;
    text-align: right;
  }

  .footer__actions {
    width: 100%;
  }

  .footer__actions :deep(.btn) {
    flex: 1 1 auto;
  }
}

@media (max-width: 900px) and (min-width: 681px) {
  .todo {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "check delete"
      "input input";
  }

  .todoToggle {
    grid-area: check;
  }

  .todoTextInput {
    grid-area: input;
  }

  .iconBtn {
    grid-area: delete;
  }
}

@keyframes page-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>


