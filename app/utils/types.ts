export type Todo = {
  id: string
  text: string
  done: boolean
}

export type Note = {
  id: string
  title: string
  todos: Todo[]
  createdAt: number
  updatedAt: number
}
