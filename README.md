<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=solid-sonner&background=tiles&project=%20" alt="solid-sonner">
</p>

# solid-sonner

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)

An opinionated toast component for Solid.

This package tracks the React [Sonner](https://sonner.emilkowal.ski/) API as closely as possible while keeping the implementation Solid-friendly.

## Install

```bash
npm i solid-sonner
# or
yarn add solid-sonner
# or
pnpm add solid-sonner
```

## Quick start

```tsx
import { Toaster, toast } from 'solid-sonner'

export default function App() {
  return (
    <div>
      <Toaster />
      <button onClick={() => toast('My first toast')}>Give me a toast</button>
    </div>
  )
}
```

## API

Exports:

- `Toaster`
- `toast`
- `useSonner`
- types: `Action`, `ExternalToast`, `ToastClassnames`, `ToastT`, `ToastToDismiss`, `ToasterProps`

### Toast types

```tsx
toast('Event has been created')
toast.success('Event has been created')
toast.info('Event has new information')
toast.warning('Event has warning')
toast.error('Event has not been created')
toast.loading('Loading data')
```

With description, icon, and actions:

```tsx
toast('Event has been created', {
  description: 'Monday, January 3rd at 6:00pm',
  icon: <MyIcon />,
  action: {
    label: 'Undo',
    onClick: () => console.log('Undo'),
  },
  cancel: {
    label: 'Cancel',
  },
})
```

### Promise toasts

```tsx
toast.promise(fetchData(), {
  loading: 'Loading...',
  success: data => `${data.name} has been added!`,
  error: 'Error',
})
```

Extended results are supported too:

```tsx
toast.promise(saveProject(), {
  loading: 'Saving...',
  success: result => ({
    message: 'Project saved',
    description: result.id,
  }),
  error: error => ({
    message: 'Save failed',
    description: String(error),
  }),
})
```

### Updating and dismissing

```tsx
const id = toast('Uploading...', { duration: Number.POSITIVE_INFINITY })

toast.success('Done', { id })
toast.dismiss(id)
toast.dismiss()
```

### Headless custom toasts

```tsx
toast.custom(id => (
  <div>
    Custom toast <button onClick={() => toast.dismiss(id)}>close</button>
  </div>
))
```

### Read current state

```tsx
const { toasts } = useSonner()

toast.getToasts()
toast.getHistory()
```

## Toaster props

```tsx
<Toaster
  theme="system"
  position="top-right"
  richColors
  closeButton
  expand
  visibleToasts={5}
  duration={5000}
  gap={14}
  offset={32}
  mobileOffset={{ bottom: 24, left: 16, right: 16 }}
  hotkey={['altKey', 'KeyT']}
  dir="auto"
  swipeDirections={['top', 'right']}
  containerAriaLabel="Notifications"
  toastOptions={{
    className: 'my-toast',
    descriptionClassName: 'my-toast-description',
    closeButtonAriaLabel: 'Close notification',
    classNames: {
      toast: 'toast',
      title: 'title',
      description: 'description',
    },
  }}
/>
```

Legacy aliases from older `solid-sonner` versions still work for compatibility:

- `class` -> `className`
- `classes` -> `classNames`
- `descriptionClass` -> `descriptionClassName`

## Multiple toasters

```tsx
<>
  <Toaster />
  <Toaster id="sidebar" position="top-left" />
</>

toast('Global toast')
toast('Sidebar toast', { toasterId: 'sidebar' })
```

## Tailwind / unstyled mode

```tsx
<Toaster
  toastOptions={{
    unstyled: true,
    classNames: {
      toast: 'bg-blue-500 text-white',
      title: 'font-semibold',
      description: 'text-blue-100',
      actionButton: 'bg-white text-blue-700',
      cancelButton: 'bg-blue-700 text-white',
      closeButton: 'bg-white text-black',
    },
  }}
/>
```

## Notes

- `pauseWhenPageIsHidden` is available and defaults to Sonner-like hidden-page pausing behavior
- Per-toast `closeButton`, `dismissible`, `richColors`, `testId`, and `toasterId` are supported
- `action` respects `event.preventDefault()` and will keep the toast open

## License

MIT
