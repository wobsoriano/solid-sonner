import type { JSX } from 'solid-js'

export type ToastTypes = 'normal' | 'action' | 'success' | 'error' | 'loading'

export type PromiseT<Data = any> = Promise<Data> | (() => Promise<Data>)

export type PromiseData<ToastData = any> = ExternalToast & {
  loading: string | JSX.Element
  success: string | JSX.Element | ((data: ToastData) => JSX.Element | string)
  error: string | JSX.Element | ((error: any) => JSX.Element | string)
  finally?: () => void | Promise<void>
}

export interface ToastT {
  id: number | string
  title?: string | JSX.Element
  type?: ToastTypes
  icon?: JSX.Element
  jsx?: JSX.Element
  invert?: boolean
  description?: JSX.Element
  duration?: number
  delete?: boolean
  important?: boolean
  action?: {
    label: string
    onClick: (event: MouseEvent) => void
  }
  cancel?: {
    label: string
    onClick?: () => void
  }
  onDismiss?: (toast: ToastT) => void
  onAutoClose?: (toast: ToastT) => void
  promise?: PromiseT
  style?: JSX.CSSProperties
  class?: string
  descriptionClass?: string
}

export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
export interface HeightT {
  height: number
  toastId: number | string
}

interface ToastOptions {
  class?: string
  descriptionClass?: string
  style?: JSX.CSSProperties
}

export interface ToasterProps {
  invert?: boolean
  theme?: 'light' | 'dark' | 'system'
  position?: Position
  hotkey?: string[]
  richColors?: boolean
  expand?: boolean
  duration?: number
  visibleToasts?: number
  closeButton?: boolean
  toastOptions?: ToastOptions
  class?: string
  style?: JSX.CSSProperties
  offset?: string | number
}

export enum SwipeStateTypes {
  SwipedOut = 'SwipedOut',
  SwipedBack = 'SwipedBack',
  NotSwiped = 'NotSwiped',
}

export type Theme = 'light' | 'dark'

export interface ToastToDismiss {
  id: number | string
  dismiss: boolean
}

export type ExternalToast = Omit<ToastT, 'id' | 'type' | 'title' | 'delete' | 'promise'> & {
  id?: number | string
}

export type FixMe = any
