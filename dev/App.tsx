import type { Component } from 'solid-js'
import { Toaster, toast } from '../src'

const App: Component = () => {
  return (
    <div>
      <Toaster richColors />
      <button onClick={() => toast.error('An error message')}>Show error</button>
      <button onClick={() => toast.success('A success message')}>Show success</button>
    </div>
  )
}

export default App
