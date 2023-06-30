import type { Component } from 'solid-js'
import { Toaster, toast } from '../src';

const App: Component = () => {
  return (
    <div>
      <Toaster />
      <button onClick={() => toast('My first toast')}>Give me a toast</button>
      <button onClick={() => toast.success('Give me a toast again please')}>Give me a toast again please</button>
    </div>
  )
}

export default App
