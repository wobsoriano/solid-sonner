<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=solid-sonner&background=tiles&project=%20" alt="solid-sonner">
</p>

# solid-sonner

[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg?style=for-the-badge&logo=pnpm)](https://pnpm.io/)

An opinionated toast component for Solid.

Based on the React [implementation](https://sonner.emilkowal.ski/).

## Quick start

Install it:

```bash
npm i solid-sonner
# or
yarn add solid-sonner
# or
pnpm add solid-sonner
```

Add `<Toaster />` to your app, it will be the place where all your toasts will be rendered. After that you can use `toast()` from anywhere in your app.

```tsx
import { Toaster, toast } from 'solid-sonner'

// ...

function App() {
  return (
    <div>
      <Toaster />
      <button onClick={() => toast('My first toast')}>Give me a toast</button>
    </div>
  )
}
```

Head over to [solid-sonner.vercel.app](https://solid-sonner.vercel.app) for the complete docs.

## License

MIT
