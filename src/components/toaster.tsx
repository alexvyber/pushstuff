import ReactDOM from "react-dom"
import { VISIBLE_TOASTS_AMOUNT, GAP, VIEWPORT_OFFSET, TOAST_WIDTH } from "../const"
import { ToastState } from "../state"
import { Height, ToasterProps, ToastToDismiss, ToastType } from "../types"
import { Toast } from "./toast"
import React from "react"

function classic(...classes: (string | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

export const Toaster = (props: ToasterProps) => {
  const {
    invert,
    position = "bottom-right",
    hotkey = ["altKey", "KeyT"],
    expand,
    closeButton,
    className,
    offset,
    theme = "light",
    richColors,
    duration,
    style,
    visibleToasts = VISIBLE_TOASTS_AMOUNT,
    toastOptions,
    gap = GAP,
    icons,
    containerAriaLabel = "Notifications",
    pauseWhenPageIsHidden,
    cx = classic,
  } = props
  const [toasts, setToasts] = React.useState<ToastType[]>([])
  const possiblePositions = React.useMemo(() => {
    return Array.from(
      new Set([position].concat(toasts.filter((toast) => toast.position).map((toast) => toast.position)))
    )
  }, [toasts, position])
  const [heights, setHeights] = React.useState<Height[]>([])
  const [expanded, setExpanded] = React.useState(false)
  const [interacting, setInteracting] = React.useState(false)
  const [actualTheme, setActualTheme] = React.useState(
    theme !== "system"
      ? theme
      : typeof window !== "undefined"
        ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : "light"
  )

  const listRef = React.useRef<HTMLOListElement>(null)
  const hotkeyLabel = hotkey.join("+").replace(/Key/g, "").replace(/Digit/g, "")
  const lastFocusedElementRef = React.useRef<HTMLElement>(null)
  const isFocusWithinRef = React.useRef(false)

  const removeToast = React.useCallback((toastToRemove: ToastType) => {
    setToasts((toasts) => {
      if (!toasts.find((toast) => toast.id === toastToRemove.id)?.delete) {
        ToastState.dismiss(toastToRemove.id)
      }

      return toasts.filter(({ id }) => id !== toastToRemove.id)
    })
  }, [])

  React.useEffect(() => {
    return ToastState.subscribe((toast) => {
      if ((toast as ToastToDismiss).dismiss) {
        setToasts((toasts) => toasts.map((t) => (t.id === toast.id ? { ...t, delete: true } : t)))
        return
      }

      // Prevent batching, temp solution.
      setTimeout(() => {
        ReactDOM.flushSync(() => {
          setToasts((toasts) => {
            const indexOfExistingToast = toasts.findIndex((t) => t.id === toast.id)

            // Update the toast if it already exists
            if (indexOfExistingToast !== -1) {
              return [
                ...toasts.slice(0, indexOfExistingToast),
                { ...toasts[indexOfExistingToast], ...toast },
                ...toasts.slice(indexOfExistingToast + 1),
              ]
            }

            return [toast, ...toasts]
          })
        })
      })
    })
  }, [])

  React.useEffect(() => {
    if (theme !== "system") {
      setActualTheme(theme)

      return
    }

    if (theme === "system") {
      const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches

      setActualTheme(isDark ? "dark" : "light")
    }

    if (typeof window === "undefined") {
      return
    }

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ({ matches: isDark }) => {
      setActualTheme(isDark ? "dark" : "light")
    })
  }, [theme])

  React.useEffect(() => {
    // Ensure expanded is always false when no toasts are present / only one left
    if (toasts.length <= 1) {
      setExpanded(false)
    }
  }, [toasts])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isHotkeyPressed = hotkey.every((key) => event[key] || event.code === key)

      if (isHotkeyPressed) {
        setExpanded(true)
        listRef.current?.focus()
      }

      if (
        event.code === "Escape" &&
        (document.activeElement === listRef.current || listRef.current?.contains(document.activeElement))
      ) {
        setExpanded(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [hotkey])

  React.useEffect(() => {
    if (listRef.current) {
      return () => {
        if (!lastFocusedElementRef.current) {
          return
        }

        lastFocusedElementRef.current.focus({ preventScroll: true })
        lastFocusedElementRef.current = null
        isFocusWithinRef.current = false
      }
    }
  }, [listRef.current])

  if (!toasts.length) {
    return null
  }

  return (
    // Remove item from normal navigation flow, only available via hotkey
    <section
      aria-label={`${containerAriaLabel} ${hotkeyLabel}`}
      tabIndex={-1}
    >
      {possiblePositions.map((position, index) => {
        const [y, x] = position.split("-")
        return (
          <ol
            key={position}
            tabIndex={-1}
            ref={listRef}
            className={className}
            data-sonner-toaster={true}
            data-theme={actualTheme}
            data-y-position={y}
            data-x-position={x}
            style={
              {
                "--front-toast-height": `${heights[0]?.height || 0}px`,
                "--offset": typeof offset === "number" ? `${offset}px` : offset || VIEWPORT_OFFSET,
                "--width": `${TOAST_WIDTH}px`,
                "--gap": `${gap}px`,
                ...style,
              } as React.CSSProperties
            }
            onBlur={(event) => {
              if (isFocusWithinRef.current && !event.currentTarget.contains(event.relatedTarget)) {
                isFocusWithinRef.current = false
                if (lastFocusedElementRef.current) {
                  lastFocusedElementRef.current.focus({ preventScroll: true })
                  lastFocusedElementRef.current = null
                }
              }
            }}
            onFocus={(event) => {
              const isNotDismissible =
                event.target instanceof HTMLElement && event.target.dataset.dismissible === "false"

              if (isNotDismissible) {
                return
              }

              if (!isFocusWithinRef.current) {
                isFocusWithinRef.current = true
                lastFocusedElementRef.current = event.relatedTarget as HTMLElement
              }
            }}
            onMouseEnter={() => setExpanded(true)}
            onMouseMove={() => setExpanded(true)}
            onMouseLeave={() => {
              // Avoid setting expanded to false when interacting with a toast, e.g. swiping
              if (!interacting) {
                setExpanded(false)
              }
            }}
            onPointerDown={(event) => {
              const isNotDismissible =
                event.target instanceof HTMLElement && event.target.dataset.dismissible === "false"

              if (isNotDismissible) {
                return
              }
              setInteracting(true)
            }}
            onPointerUp={() => setInteracting(false)}
          >
            {toasts
              .filter((toast) => (!toast.position && index === 0) || toast.position === position)
              .map((toast, index) => (
                <Toast
                  key={toast.id}
                  icons={icons}
                  index={index}
                  toast={toast}
                  defaultRichColors={richColors}
                  duration={toastOptions?.duration ?? duration}
                  className={toastOptions?.className}
                  descriptionClassName={toastOptions?.descriptionClassName}
                  invert={invert}
                  visibleToasts={visibleToasts}
                  closeButton={toastOptions?.closeButton ?? closeButton}
                  interacting={interacting}
                  position={position}
                  style={toastOptions?.style}
                  unstyled={toastOptions?.unstyled}
                  classNames={toastOptions?.classNames}
                  cancelButtonStyle={toastOptions?.cancelButtonStyle}
                  actionButtonStyle={toastOptions?.actionButtonStyle}
                  removeToast={removeToast}
                  toasts={toasts.filter((t) => t.position === toast.position)}
                  heights={heights.filter((h) => h.position === toast.position)}
                  setHeights={setHeights}
                  expandByDefault={expand}
                  gap={gap}
                  expanded={expanded}
                  pauseWhenPageIsHidden={pauseWhenPageIsHidden}
                  cx={cx}
                />
              ))}
          </ol>
        )
      })}
    </section>
  )
}
