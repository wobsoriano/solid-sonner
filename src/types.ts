import type { JSX, Setter } from 'solid-js'

export type ToastTypes = 'normal' | 'action' | 'success' | 'info' | 'warning' | 'error' | 'loading' | 'default'

export type PromiseT<Data = any> = Promise<Data> | (() => Promise<Data>)

export type PromiseData<ToastData = any> = ExternalToast & {
  loading: string | JSX.Element
  success: string | JSX.Element | ((data: ToastData) => JSX.Element | string)
  error: string | JSX.Element | ((error: any) => JSX.Element | string)
  finally?: () => void | Promise<void>
}

export interface ToastClasses {
  toast?: string
  title?: string
  description?: string
  loader?: string
  closeButton?: string
  cancelButton?: string
  actionButton?: string
  success?: string
  error?: string
  info?: string
  warning?: string
  loading?: string
  default?: string
}

export interface ToastIcons {
  success?: JSX.Element
  info?: JSX.Element
  warning?: JSX.Element
  error?: JSX.Element
  loading?: JSX.Element
}

export interface ToastT {
  id: number | string
  title?: string | JSX.Element
  type?: ToastTypes
  icon?: JSX.Element
  jsx?: JSX.Element
  invert?: boolean
  closeButton?: boolean
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
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  style?: JSX.CSSProperties
  unstyled?: boolean
  class?: string
  classes?: ToastClasses
  descriptionClass?: string
  position?: Position
}

export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
export interface HeightT {
  height: number
  toastId: number | string
}

interface ToastOptions {
  class?: string
  closeButton?: boolean
  descriptionClass?: string
  style?: JSX.CSSProperties
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  duration?: number
  unstyled?: boolean
  classes?: ToastClasses
}

export interface ToasterProps {
  invert?: boolean
  theme?: 'light' | 'dark' | 'system'
  position?: Position
  hotkey?: string[]
  richColors?: boolean
  expand?: boolean
  duration?: number
  gap?: number
  visibleToasts?: number
  closeButton?: boolean
  toastOptions?: ToastOptions
  class?: string
  style?: JSX.CSSProperties
  offset?: string | number
  icons?: ToastIcons
  dir?: 'rtl' | 'ltr' | 'auto'
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

export interface ToastProps {
  toast: ToastT
  toasts: ToastT[]
  index: number
  expanded: boolean
  invert: boolean
  heights: HeightT[]
  setHeights: Setter<HeightT[]>
  removeToast: (toast: ToastT) => void
  gap?: number
  position: Position
  visibleToasts: number
  expandByDefault: boolean
  closeButton: boolean
  interacting: boolean
  style?: JSX.CSSProperties
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  duration?: number
  class?: string
  unstyled?: boolean
  descriptionClass?: string
  classes?: ToastClasses
  icons?: ToastIcons
}
