export default defineNuxtPlugin(() => {
  const store = useNotesStore()
  store.hydrate()
})
