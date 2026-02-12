<template>
  <div class="page" :style="{ '--mobile-footer-height': `${mobileFooterHeight}px` }">
    <div class="hero">
      <header class="top">
        <button class="back" type="button" @click="onBack">К списку заметок</button>

        <div class="actions" v-if="isReady">
          <BaseButton v-if="!isNew" danger class="actions__deleteDesktop" @click="askDelete">Удалить</BaseButton>
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
          <div class="historyPanel__hint">
            <span>«Отменить» - отменяет последнее изменение.</span>
            <span>«Повторить» - возвращает действие, которое вы только что отменили.</span>
          </div>
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
          <div class="line__copy">
            <div class="label">Список задач</div>
            <div class="todoHint">Чекбокс «Готово» отмечает выполнение пункта.</div>
          </div>
          <BaseButton variant="secondary" @click="addTodo">Добавить пункт</BaseButton>
        </div>

        <TransitionGroup name="todoList" tag="div" class="todos">
          <div v-for="t in draft.todos" :key="t.id" class="todo" :data-todo-id="t.id">
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

            <button class="iconBtn" type="button" aria-label="Удалить пункт" @click="askRemoveTodo(t.id)">x</button>
          </div>
        </TransitionGroup>

        <p v-if="draft.todos.length === 0" class="muted">Пока нет задач.</p>
      </div>

      <footer ref="footerRef" class="footer" :class="{ 'footer--sticky': isReady }">
        <div class="saveState" :class="{ 'saveState--visible': saveMessageVisible }" aria-live="polite">{{ saveMessage }}</div>

        <div class="footer__actions">
          <BaseButton v-if="!isNew && hasUnsaved" variant="secondary" @click="askCancel">Отменить редактирование</BaseButton>
          <BaseButton :disabled="!hasUnsaved" @click="save">
            {{ hasUnsaved ? 'Сохранить изменения' : 'Сохранено' }}
          </BaseButton>
        </div>
        <BaseButton v-if="!isNew" danger class="footer__deleteMobile" @click="askDelete">Удалить</BaseButton>
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
definePageMeta({
  key: (route) => String(route.name ?? 'notes-id')
})

const {
  isNew,
  isReady,
  draft,
  canUndo,
  canRedo,
  saveMessage,
  saveMessageVisible,
  hasUnsaved,
  cancelOpen,
  deleteOpen,
  todoDeleteOpen,
  undoDeleteOpen,
  undoDeleteCount,
  footerRef,
  mobileFooterHeight,
  pluralizeTodos,
  undo,
  redo,
  setTitle,
  addTodo,
  setTodoDone,
  onTodoTextareaFocus,
  onTodoInput,
  askRemoveTodo,
  askCancel,
  save,
  onCancelModalClose,
  confirmCancel,
  askDelete,
  confirmDelete,
  onTodoDeleteClose,
  confirmRemoveTodo,
  onUndoDeleteClose,
  confirmUndoDelete,
  onBack
} = useNoteEditorPage()
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
  display: flex;
  align-items: center;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  width: 100%;
  margin-bottom: 0;
  min-height: 42px;
}

.back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #ccd8f6;
  border-radius: 11px;
  background: #f5f8ff;
  color: #213772;
  padding: 9px 14px;
  min-height: 40px;
  font-size: 14px;
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

.footer__deleteMobile {
  display: none;
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
  align-items: center;
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
  display: grid;
  gap: 2px;
}

.historyPanel__actions {
  display: inline-flex;
  gap: 8px;
  flex-wrap: nowrap;
  flex: 0 0 auto;
  align-items: center;
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
  margin-bottom: 10px;
}

.line__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
  align-content: center;
}

.todoHint {
  margin: 0;
  color: #56618a;
  font-size: 13px;
}

.todos {
  margin-top: 0;
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
  .page {
    padding: 22px 14px calc(var(--mobile-footer-height, 0px) + env(safe-area-inset-bottom));
  }

  .hero {
    padding: 8px;
    border-radius: 18px;
  }

  .editor {
    padding: 12px;
    border-radius: 16px;
    animation: none;
    transform: none;
  }

  .historyPanel {
    flex-direction: column;
    align-items: stretch;
  }

  .historyPanel__actions :deep(.btn) {
    width: 100%;
  }

  .top {
    align-items: center;
    justify-content: flex-start;
  }

  .actions {
    display: none;
  }

  .actions__deleteDesktop {
    display: none;
  }

  .line :deep(.btn) {
    width: 100%;
  }

  .historyPanel__actions {
    flex-wrap: wrap;
  }

  .todo {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      "check delete"
      "input input";
    align-items: start;
  }

  .todoToggle {
    grid-area: check;
  }

  .todoTextArea {
    grid-area: input;
  }

  .iconBtn {
    grid-area: delete;
    justify-self: end;
    align-self: center;
  }

  .footer--sticky {
    position: fixed;
    left: 14px;
    right: 14px;
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
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    align-items: stretch;
    border-radius: 14px 14px 0 0;
  }

  .saveState {
    display: none;
    margin: 0;
  }

  .saveState--visible {
    display: block;
    order: 1;
    width: 100%;
    text-align: left;
  }

  .footer__actions {
    width: 100%;
    margin-left: 0;
    order: 2;
  }

  .footer__actions :deep(.btn) {
    flex: 1 1 auto;
  }

  .footer__deleteMobile {
    display: inline-flex;
    width: 100%;
    order: 3;
    margin: 0;
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

  .todoTextArea {
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


