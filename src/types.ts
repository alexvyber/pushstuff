export type TypesOfToast = "normal" | "action" | "success" | "info" | "warning" | "error" | "loading" | "default"

export type PromiseResult<Data = unknown> =
  | string
  | React.ReactNode
  | ((data: Data) => React.ReactNode | string | Promise<React.ReactNode | string>)

export type PromiseExternalToast = Omit<ExternalToast, "description">

export type PromiseData<ToastData = unknown> = PromiseExternalToast & {
  loading?: string | React.ReactNode
  success?: PromiseResult<ToastData>
  error?: PromiseResult
  description?: PromiseResult
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
  success?: React.ReactNode
  info?: React.ReactNode
  warning?: React.ReactNode
  error?: React.ReactNode
  loading?: React.ReactNode
}

export interface Action {
  label: React.ReactNode
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  actionButtonStyle?: React.CSSProperties
}

export interface ToastType {
  id: number | string
  title?: string | React.ReactNode
  type?: TypesOfToast
  icon?: React.ReactNode
  jsx?: React.ReactNode
  richColors?: boolean
  invert?: boolean
  closeButton?: boolean
  dismissible?: boolean
  description?: React.ReactNode
  duration?: number
  delete?: boolean
  important?: boolean
  action?: Action | React.ReactNode
  cancel?: Action | React.ReactNode
  onDismiss?: (toast: ToastType) => void
  onAutoClose?: (toast: ToastType) => void
  promise?: Promise<unknown> | (() => Promise<unknown>)
  cancelButtonStyle?: React.CSSProperties
  actionButtonStyle?: React.CSSProperties
  style?: React.CSSProperties
  unstyled?: boolean
  className?: string
  classNames?: ToastClassnames
  descriptionClassName?: string
  position?: Position
}

export function isAction(action: Action | React.ReactNode): action is Action {
  return (action as Action).label !== undefined
}

export type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center"

export interface Height {
  height: number
  toastId: number | string
  position: Position
}

interface ToastOptions {
  className?: string
  closeButton?: boolean
  descriptionClassName?: string
  style?: React.CSSProperties
  cancelButtonStyle?: React.CSSProperties
  actionButtonStyle?: React.CSSProperties
  duration?: number
  unstyled?: boolean
  classNames?: ToastClassnames
}

type Cx = (...classes: Array<string | undefined>) => string

export interface ToasterProps {
  invert?: boolean
  theme?: "light" | "dark" | "system"
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
  style?: React.CSSProperties
  offset?: string | number
  icons?: ToastIcons
  containerAriaLabel?: string
  pauseWhenPageIsHidden?: boolean
  cx?: Cx
}

export interface ToastProps {
  toast: ToastType
  toasts: ToastType[]
  index: number
  expanded: boolean
  invert: boolean
  heights: Height[]
  setHeights: React.Dispatch<React.SetStateAction<Height[]>>
  removeToast: (toast: ToastType) => void
  gap?: number
  position: Position
  visibleToasts: number
  expandByDefault: boolean
  closeButton: boolean
  interacting: boolean
  style?: React.CSSProperties
  cancelButtonStyle?: React.CSSProperties
  actionButtonStyle?: React.CSSProperties
  duration?: number
  className?: string
  unstyled?: boolean
  descriptionClassName?: string
  loadingIcon?: React.ReactNode
  classNames?: ToastClassnames
  icons?: ToastIcons
  closeButtonAriaLabel?: string
  pauseWhenPageIsHidden: boolean
  cx: Cx
  defaultRichColors?: boolean
}

export type Theme = "light" | "dark"

export interface ToastToDismiss {
  id: number | string
  dismiss: boolean
}

export type ExternalToast = Omit<ToastType, "id" | "type" | "title" | "jsx" | "delete" | "promise"> & {
  id?: number | string
}
