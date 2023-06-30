import { CodeBlock } from '../CodeBlock'

export function Usage() {
  return (
    <div>
      <h2>Usage</h2>
      <p>Render the toaster in the root of your app.</p>
      <CodeBlock>{`import { Toaster, toast } from 'solid-sonner'
        
function App() {
  return (
    <div>
      <Toaster />
      <button onClick={() => toast('My first toast')}>
        Give me a toast
      </button>
    </div>
  )
}`}
      </CodeBlock>
    </div>
  )
}
