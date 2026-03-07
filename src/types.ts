import type { JSX, Setter } from 'solid-js'

export type ToastTypes = 'normal' | 'action' | 'success' | 'info' | 'warning' | 'error' | 'loading' | 'default'

export type PromiseT<Data = any> = Promise<Data> | (() => Promise<Data>)

export type ToastContent = (() => JSX.Element) | JSX.Element

export interface PromiseIExtendedResult extends ExternalToast {
  message: JSX.Element | string
}

export type PromiseTExtendedResult<Data = any>
  = | PromiseIExtendedResult
  | ((data: Data) => PromiseIExtendedResult | Promise<PromiseIExtendedResult>)

export type PromiseTResult<Data = any>
  = | string
  | JSX.Element
  | ((data: Data) => JSX.Element | string | Promise<JSX.Element | string>)

export type PromiseExternalToast = Omit<ExternalToast, 'description'>

export type PromiseData<ToastData = any> = PromiseExternalToast & {
  loading?: string | JSX.Element
  success?: PromiseTResult<ToastData> | PromiseTExtendedResult<ToastData>
  error?: PromiseTResult | PromiseTExtendedResult
  description?: PromiseTResult
  finally?: () => void | Promise<void>
}

export interface ToastClassnames {
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
  content?: string
  icon?: string
}

export interface ToastIcons {
  success?: JSX.Element | null
  info?: JSX.Element | null
  warning?: JSX.Element | null
  error?: JSX.Element | null
  loading?: JSX.Element | null
  close?: JSX.Element | null
}

export interface Action {
  label: JSX.Element
  onClick: (event: MouseEvent) => void
  actionButtonStyle?: JSX.CSSProperties
}

export interface ToastT {
  id: number | string
  toasterId?: string
  title?: ToastContent
  type?: ToastTypes
  icon?: JSX.Element | null
  jsx?: JSX.Element
  richColors?: boolean
  invert?: boolean
  closeButton?: boolean
  dismissible?: boolean
  description?: ToastContent
  duration?: number
  delete?: boolean
  action?: Action | JSX.Element
  cancel?: Action | JSX.Element
  onDismiss?: (toast: ToastT) => void
  onAutoClose?: (toast: ToastT) => void
  promise?: PromiseT
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  style?: JSX.CSSProperties
  unstyled?: boolean
  className?: string
  classNames?: ToastClassnames
  descriptionClassName?: string
  position?: Position
  testId?: string
  class?: string
  classes?: ToastClassnames
  descriptionClass?: string
}

export function isAction(action: Action | JSX.Element): action is Action {
  return typeof action === 'object' && action !== null && 'label' in action
}

export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'

export interface HeightT {
  height: number
  toastId: number | string
  toasterId?: string
  position?: Position
}

export interface ToastOptions {
  className?: string
  closeButton?: boolean
  descriptionClassName?: string
  style?: JSX.CSSProperties
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  duration?: number
  unstyled?: boolean
  classNames?: ToastClassnames
  closeButtonAriaLabel?: string
  toasterId?: string
  class?: string
  classes?: ToastClassnames
  descriptionClass?: string
}

export type Offset =
  | {
    top?: string | number
    right?: string | number
    bottom?: string | number
    left?: string | number
  }
  | string
  | number

export type SwipeDirection = 'top' | 'right' | 'bottom' | 'left'

export interface ToasterProps {
  id?: string
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
  className?: string
  style?: JSX.CSSProperties
  offset?: Offset
  mobileOffset?: Offset
  dir?: 'rtl' | 'ltr' | 'auto'
  swipeDirections?: SwipeDirection[]
  icons?: ToastIcons
  customAriaLabel?: string
  containerAriaLabel?: string
  pauseWhenPageIsHidden?: boolean
  class?: string
}

export interface ToastProps {
  toast: ToastT
  toasts: ToastT[]
  index: number
  swipeDirections?: SwipeDirection[]
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
  className?: string
  unstyled?: boolean
  descriptionClassName?: string
  classNames?: ToastClassnames
  icons?: ToastIcons
  closeButtonAriaLabel?: string
  defaultRichColors?: boolean
  pauseWhenPageIsHidden?: boolean
  class?: string
  classes?: ToastClassnames
  descriptionClass?: string
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

export type ExternalToast = Omit<ToastT, 'id' | 'type' | 'title' | 'jsx' | 'delete' | 'promise'> & {
  id?: number | string
  toasterId?: string
}
