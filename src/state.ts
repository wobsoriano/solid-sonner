import type { JSX } from 'solid-js'
import {
  type ExternalToast,
  type PromiseData,
  type PromiseIExtendedResult,
  type PromiseT,
  type ToastContent,
  type ToastT,
  type ToastToDismiss,
  type ToastTypes,
} from './types'

let toastsCounter = 1

class Observer {
  subscribers: Array<(toast: ToastT | ToastToDismiss) => void>
  toasts: Array<ToastT | ToastToDismiss>
  dismissedToasts: Set<string | number>

  constructor() {
    this.subscribers = []
    this.toasts = []
    this.dismissedToasts = new Set()
  }

  subscribe = (subscriber: (toast: ToastT | ToastToDismiss) => void) => {
    this.subscribers.push(subscriber)

    return () => {
      const index = this.subscribers.indexOf(subscriber)
      this.subscribers.splice(index, 1)
    }
  }

  publish = (data: ToastT) => {
    this.subscribers.forEach(subscriber => subscriber(data))
  }

  addToast = (data: ToastT) => {
    this.publish(data)
    this.toasts = [...this.toasts, data]
  }

  create = (data: ExternalToast & {
    message?: ToastContent
    type?: ToastTypes
    promise?: PromiseT
    jsx?: JSX.Element
  }) => {
    const { message, ...rest } = data
    const hasStringId = typeof data.id === 'string' && data.id.length > 0
    const id: string | number = typeof data.id === 'number' || hasStringId ? data.id as string | number : toastsCounter++
    const alreadyExists = this.toasts.find((toast) => {
      return toast.id === id
    })
    const dismissible = data.dismissible === undefined ? true : data.dismissible

    if (this.dismissedToasts.has(id))
      this.dismissedToasts.delete(id)

    if (alreadyExists) {
      this.toasts = this.toasts.map((toast) => {
        if (toast.id === id) {
          this.publish({ ...toast, ...data, id, title: message, dismissible } as ToastT)
          return {
            ...toast,
            ...data,
            id,
            dismissible,
            title: message,
          }
        }

        return toast
      })
    }
    else {
      this.addToast({ title: message, ...rest, dismissible, id })
    }

    return id
  }

  dismiss = (id?: number | string) => {
    if (id) {
      this.dismissedToasts.add(id)
      requestAnimationFrame(() => {
        this.subscribers.forEach(subscriber => subscriber({ id, dismiss: true }))
      })
    }
    else {
      this.toasts.forEach((toast) => {
        this.dismissedToasts.add(toast.id)
        this.subscribers.forEach(subscriber => subscriber({ id: toast.id, dismiss: true }))
      })
    }

    return id
  }

  message = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, message })
  }

  error = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, message, type: 'error' })
  }

  success = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, type: 'success', message })
  }

  info = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, type: 'info', message })
  }

  warning = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, type: 'warning', message })
  }

  loading = (message: ToastContent, data?: ExternalToast) => {
    return this.create({ ...data, type: 'loading', message })
  }

  promise = <ToastData>(promise: PromiseT<ToastData>, data?: PromiseData<ToastData>) => {
    if (!data)
      return

    let id: string | number | undefined

    if (data.loading !== undefined) {
      id = this.create({
        ...data,
        promise,
        type: 'loading',
        message: data.loading,
        description: typeof data.description !== 'function' ? data.description : undefined,
      })
    }

    const p = Promise.resolve(typeof promise === 'function' ? promise() : promise)

    let shouldDismiss = id !== undefined
    let result: ['resolve', ToastData] | ['reject', unknown]

    const originalPromise = p
      .then(async (response) => {
        result = ['resolve', response]

        if (isValidElement(response)) {
          shouldDismiss = false
          this.create({ id, type: 'default', message: response })
        }
        else if (isHttpResponse(response) && !response.ok) {
          shouldDismiss = false

          const promiseData = typeof data.error === 'function' ? await data.error(`HTTP error! status: ${response.status}`) : data.error
          const description = typeof data.description === 'function'
            ? await data.description(`HTTP error! status: ${response.status}`)
            : data.description

          const toastSettings: PromiseIExtendedResult = isExtendedResult(promiseData)
            ? promiseData as PromiseIExtendedResult
            : { message: promiseData as JSX.Element }

          this.create({ id, type: 'error', description, ...toastSettings })
        }
        else if (response instanceof Error) {
          shouldDismiss = false

          const promiseData = typeof data.error === 'function' ? await data.error(response) : data.error
          const description = typeof data.description === 'function' ? await data.description(response) : data.description

          const toastSettings: PromiseIExtendedResult = isExtendedResult(promiseData)
            ? promiseData as PromiseIExtendedResult
            : { message: promiseData as JSX.Element }

          this.create({ id, type: 'error', description, ...toastSettings })
        }
        else if (data.success !== undefined) {
          shouldDismiss = false

          const promiseData = typeof data.success === 'function' ? await data.success(response) : data.success
          const description = typeof data.description === 'function' ? await data.description(response) : data.description

          const toastSettings: PromiseIExtendedResult = isExtendedResult(promiseData)
            ? promiseData as PromiseIExtendedResult
            : { message: promiseData as JSX.Element }

          this.create({ id, type: 'success', description, ...toastSettings })
        }
      })
      .catch(async (error) => {
        result = ['reject', error]

        if (data.error !== undefined) {
          shouldDismiss = false

          const promiseData = typeof data.error === 'function' ? await data.error(error) : data.error
          const description = typeof data.description === 'function' ? await data.description(error) : data.description

          const toastSettings: PromiseIExtendedResult = isExtendedResult(promiseData)
            ? promiseData as PromiseIExtendedResult
            : { message: promiseData as JSX.Element }

          this.create({ id, type: 'error', description, ...toastSettings })
        }
      })
      .finally(() => {
        if (shouldDismiss) {
          this.dismiss(id)
          id = undefined
        }

        data.finally?.()
      })

    const unwrap = () => new Promise<ToastData>((resolve, reject) => {
      originalPromise.then(() => {
        if (result[0] === 'reject')
          reject(result[1])
        else
          resolve(result[1])
      }).catch(reject)
    })

    if (typeof id !== 'string' && typeof id !== 'number')
      return { unwrap }

    return Object.assign(id as unknown as Record<string, unknown>, { unwrap })
  }

  custom = (jsx: (id: number | string) => JSX.Element, data?: ExternalToast) => {
    const id = data?.id || toastsCounter++
    this.create({ jsx: jsx(id), ...data, id })
    return id
  }

  getActiveToasts = () => {
    return this.toasts.filter(toast => !this.dismissedToasts.has(toast.id)) as ToastT[]
  }
}

function isHttpResponse(data: any): data is Response {
  return data && typeof data === 'object' && 'ok' in data && typeof data.ok === 'boolean' && 'status' in data && typeof data.status === 'number'
}

function isExtendedResult(value: unknown): value is PromiseIExtendedResult {
  return typeof value === 'object' && value !== null && 'message' in value
}

function isValidElement(value: unknown): value is JSX.Element {
  return typeof Node !== 'undefined' && value instanceof Node
}

export const ToastState = new Observer()

function toastFunction(message: ToastContent, data?: ExternalToast) {
  const id = data?.id || toastsCounter++

  ToastState.addToast({
    title: message,
    ...data,
    id,
  })

  return id
}

const basicToast = toastFunction

const getHistory = () => ToastState.toasts
const getToasts = () => ToastState.getActiveToasts()

export const toast = Object.assign(
  basicToast,
  {
    success: ToastState.success,
    info: ToastState.info,
    warning: ToastState.warning,
    error: ToastState.error,
    custom: ToastState.custom,
    message: ToastState.message,
    promise: ToastState.promise,
    dismiss: ToastState.dismiss,
    loading: ToastState.loading,
  },
  {
    getHistory,
    getToasts,
  },
)
