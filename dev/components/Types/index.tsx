import { For, createSignal } from 'solid-js'
import { toast } from 'src/'
import { CodeBlock } from '../CodeBlock'

// eslint-disable-next-line no-template-curly-in-string
const promiseCode = '`${data.name} toast has been added`'

const allTypes = [
  {
    name: 'Default',
    snippet: 'toast(\'Event has been created\')',
    action: () => toast('Event has been created'),
  },
  {
    name: 'Description',
    snippet: `toast.message('Event has been created', {
  description: 'Monday, January 3rd at 6:00pm',
})`,
    action: () =>
      toast('Event has been created', {
        description: 'Monday, January 3rd at 6:00pm',
      }),
  },
  {
    name: 'Success',
    snippet: 'toast.success(\'Event has been created\')',
    action: () => toast.success('Event has been created'),
  },
  {
    name: 'Info',
    snippet: 'toast.info(\'Event will be created\')',
    action: () => toast.info('Event will be created'),
  },
  {
    name: 'Warning',
    snippet: 'toast.warning(\'Event has warnings\')',
    action: () => toast.warning('Event has warnings'),
  },
  {
    name: 'Error',
    snippet: 'toast.error(\'Event has not been created\')',
    action: () => toast.error('Event has not been created'),
  },
  {
    name: 'Action',
    snippet: `toast('Event has been created', {
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo')
  },
})`,
    action: () =>
      toast.message('Event has been created', {
        action: {
          label: 'Undo',
          // eslint-disable-next-line no-console
          onClick: () => console.log('Undo'),
        },
      }),
  },
  {
    name: 'Promise',
    snippet: `const promise = () => new Promise((resolve) => setTimeout(resolve, 2000));

toast.promise(promise, {
  loading: 'Loading...',
  success: (data) => {
    return ${promiseCode};
  },
  error: 'Error',
});`,
    action: () =>
      toast.promise<{ name: string }>(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              const random50Percent = Math.floor(Math.random() * 2)
              if (random50Percent > 0)
                reject(new Error('Something\'s not right!'))
              resolve({ name: 'Solid Sonner' })
            }, 1500)
          }),
        {
          loading: 'Loading...',
          success: (data) => {
            return `${data.name} toast has been added`
          },
          error: 'Error',
        },
      ),
  },
  {
    name: 'Loading',
    snippet: `const promise = () => new Promise((resolve) => setTimeout(resolve, 800));

toast.loading('Uploading...', { id: 'form' });
await promise();
toast.loading('Saving...', { id: 'form'});
await promise();
toast.success('Success!', { id: 'form' });
`,
    action: async () => {
      const idAlphabet = 'abcdefghijklmnopqrstuvwxyz1234567890'
      const getRandomIndex = () => Math.floor(Math.random() * idAlphabet.length)
      const toastId = idAlphabet[getRandomIndex()]! + idAlphabet[getRandomIndex()]! + idAlphabet[getRandomIndex()]!

      const promise = () => new Promise((resolve) => {
        setTimeout(resolve, 1000)
      })
      toast.loading('Uploading...', { id: toastId })
      await promise()
      toast.loading('Saving...', { id: toastId })
      await promise()
      toast.success('Success!', { id: toastId })
    },
  },
  {
    name: 'Custom',
    snippet: 'toast(<div>A custom toast with default styling</div>)',
    action: () => toast(<div>A custom toast with default styling</div>),
  },
]

export function Types() {
  const [activeType, setActiveType] = createSignal(allTypes[0])

  return (
    <div>
      <h2>Types</h2>
      <p>You can customize the type of toast you want to render, and pass an options object as the second argument.</p>
      <div class="buttons">
        <For each={allTypes}>{type => (
          <button
            class="button"
            data-testid={type.name}
            data-active={activeType()?.name === type.name}
            onClick={() => {
              type.action()
              setActiveType(type)
            }}

          >
            {type.name}
          </button>
        )}</For>
      </div>
      <CodeBlock>{`${activeType()?.snippet}`}</CodeBlock>
    </div>
  )
}
