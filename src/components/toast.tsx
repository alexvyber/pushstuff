import { Loader, getAsset } from "../assets"
import { TOAST_LIFETIME, TIME_BEFORE_UNMOUNT, SWIPE_THRESHOLD } from "../const"
import { useIsDocumentHidden } from "../hooks"
import { isAction, ToastProps } from "../types"
import React from "react"

export const Toast = (props: ToastProps) => {
  const {
    invert: ToasterInvert,
    toast,
    unstyled,
    interacting,
    setHeights,
    visibleToasts,
    heights,
    index,
    toasts,
    expanded,
    removeToast,
    defaultRichColors,
    closeButton: closeButtonFromToaster,
    style,
    cancelButtonStyle,
    actionButtonStyle,
    className = "",
    descriptionClassName = "",
    duration: durationFromToaster,
    position,
    gap,
    loadingIcon: loadingIconProp,
    expandByDefault,
    classNames,
    icons,
    closeButtonAriaLabel = "Close toast",
    pauseWhenPageIsHidden,
    cx,
  } = props
  const [mounted, setMounted] = React.useState(false)
  const [removed, setRemoved] = React.useState(false)
  const [swiping, setSwiping] = React.useState(false)
  const [swipeOut, setSwipeOut] = React.useState(false)
  const [offsetBeforeRemove, setOffsetBeforeRemove] = React.useState(0)
  const [initialHeight, setInitialHeight] = React.useState(0)
  const dragStartTime = React.useRef<Date | null>(null)
  const toastRef = React.useRef<HTMLLIElement>(null)
  const isFront = index === 0
  const isVisible = index + 1 <= visibleToasts
  const toastType = toast.type
  const dismissible = toast.dismissible !== false
  const toastClassname = toast.className || ""
  const toastDescriptionClassname = toast.descriptionClassName || ""
  // Height index is used to calculate the offset as it gets updated before the toast array, which means we can calculate the new layout faster.
  const heightIndex = React.useMemo(
    () => heights.findIndex((height) => height.toastId === toast.id) || 0,
    [heights, toast.id]
  )
  const closeButton = React.useMemo(
    () => toast.closeButton ?? closeButtonFromToaster,
    [toast.closeButton, closeButtonFromToaster]
  )
  const duration = React.useMemo(
    () => toast.duration || durationFromToaster || TOAST_LIFETIME,
    [toast.duration, durationFromToaster]
  )
  const closeTimerStartTimeRef = React.useRef(0)
  const offset = React.useRef(0)
  const lastCloseTimerStartTimeRef = React.useRef(0)
  const pointerStartRef = React.useRef<{ x: number; y: number } | null>(null)
  const [y, x] = position.split("-")
  const toastsHeightBefore = React.useMemo(() => {
    return heights.reduce((prev, curr, reducerIndex) => {
      // Calculate offset up until current  toast
      if (reducerIndex >= heightIndex) {
        return prev
      }

      return prev + curr.height
    }, 0)
  }, [heights, heightIndex])
  const isDocumentHidden = useIsDocumentHidden()

  const invert = toast.invert || ToasterInvert
  const disabled = toastType === "loading"

  offset.current = React.useMemo(() => heightIndex * gap + toastsHeightBefore, [heightIndex, toastsHeightBefore])

  React.useEffect(() => {
    // Trigger enter animation without using CSS animation
    setMounted(true)
  }, [])

  React.useLayoutEffect(() => {
    if (!mounted) {
      return
    }
    const toastNode = toastRef.current
    const originalHeight = toastNode.style.height
    toastNode.style.height = "auto"
    const newHeight = toastNode.getBoundingClientRect().height
    toastNode.style.height = originalHeight

    setInitialHeight(newHeight)

    setHeights((heights) => {
      const alreadyExists = heights.find((height) => height.toastId === toast.id)
      if (alreadyExists) {
        return heights.map((height) => (height.toastId === toast.id ? { ...height, height: newHeight } : height))
      }

      return [{ toastId: toast.id, height: newHeight, position: toast.position }, ...heights]
    })
  }, [mounted, toast.title, toast.description, setHeights, toast.id])

  const deleteToast = React.useCallback(() => {
    // Save the offset for the exit swipe animation
    setRemoved(true)
    setOffsetBeforeRemove(offset.current)
    setHeights((h) => h.filter((height) => height.toastId !== toast.id))

    setTimeout(() => {
      removeToast(toast)
    }, TIME_BEFORE_UNMOUNT)
  }, [toast, removeToast, setHeights, offset])

  React.useEffect(() => {
    if (
      (toast.promise && toastType === "loading") ||
      toast.duration === Number.POSITIVE_INFINITY ||
      toast.type === "loading"
    ) {
      return
    }
    let timeoutId: NodeJS.Timeout
    let remainingTime = duration

    // Pause the timer on each hover
    const pauseTimer = () => {
      if (lastCloseTimerStartTimeRef.current < closeTimerStartTimeRef.current) {
        // Get the elapsed time since the timer started
        const elapsedTime = new Date().getTime() - closeTimerStartTimeRef.current

        remainingTime -= elapsedTime
      }

      lastCloseTimerStartTimeRef.current = new Date().getTime()
    }

    const startTimer = () => {
      // setTimeout(, Infinity) behaves as if the delay is 0.
      // As a result, the toast would be closed immediately, giving the appearance that it was never rendered.
      // See: https://github.com/denysdovhan/wtfjs?tab=readme-ov-file#an-infinite-timeout
      if (remainingTime === Number.POSITIVE_INFINITY) {
        return
      }

      closeTimerStartTimeRef.current = new Date().getTime()

      // Let the toast know it has started
      timeoutId = setTimeout(() => {
        toast.onAutoClose?.(toast)
        deleteToast()
      }, remainingTime)
    }

    if (expanded || interacting || (pauseWhenPageIsHidden && isDocumentHidden)) {
      pauseTimer()
    } else {
      startTimer()
    }

    return () => clearTimeout(timeoutId)
  }, [
    expanded,
    interacting,
    expandByDefault,
    toast,
    duration,
    deleteToast,
    toast.promise,
    toastType,
    pauseWhenPageIsHidden,
    isDocumentHidden,
  ])

  React.useEffect(() => {
    const toastNode = toastRef.current

    if (toastNode) {
      const height = toastNode.getBoundingClientRect().height

      // Add toast height tot heights array after the toast is mounted
      setInitialHeight(height)
      setHeights((h) => [{ toastId: toast.id, height, position: toast.position }, ...h])

      return () => setHeights((h) => h.filter((height) => height.toastId !== toast.id))
    }
  }, [setHeights, toast.id])

  React.useEffect(() => {
    if (toast.delete) {
      deleteToast()
    }
  }, [deleteToast, toast.delete])

  function getLoadingIcon() {
    if (icons?.loading) {
      return (
        <div
          className="sonner-loader"
          data-visible={toastType === "loading"}
        >
          {icons.loading}
        </div>
      )
    }

    if (loadingIconProp) {
      return (
        <div
          className="sonner-loader"
          data-visible={toastType === "loading"}
        >
          {loadingIconProp}
        </div>
      )
    }
    return <Loader visible={toastType === "loading"} />
  }

  const onPointerDown: React.PointerEventHandler<HTMLElement> = (event) => {
    if (disabled || !dismissible) {
      return
    }

    if (!(event.target instanceof HTMLElement)) {
      return
    }

    dragStartTime.current = new Date()

    setOffsetBeforeRemove(offset.current)

    // Ensure we maintain correct pointer capture even when going outside of the toast (e.g. when swiping)
    event.target.setPointerCapture(event.pointerId)

    if (event.target.tagName === "BUTTON") {
      return
    }

    setSwiping(true)

    pointerStartRef.current = { x: event.clientX, y: event.clientY }
  }

  const onPointerUp: React.PointerEventHandler<HTMLElement> = () => {
    if (swipeOut || !dismissible) {
      return
    }

    pointerStartRef.current = null

    const swipeAmount = Number(toastRef.current?.style.getPropertyValue("--swipe-amount").replace("px", "") || 0)

    const timeTaken = new Date().getTime() - dragStartTime.current?.getTime()

    const velocity = Math.abs(swipeAmount) / timeTaken

    // Remove only if threshold is met
    if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.12) {
      setOffsetBeforeRemove(offset.current)

      toast.onDismiss?.(toast)

      deleteToast()

      setSwipeOut(true)

      return
    }

    toastRef.current?.style.setProperty("--swipe-amount", "0px")

    setSwiping(false)
  }

  const onPointerMove: React.PointerEventHandler<HTMLElement> = (event) => {
    if (!(pointerStartRef.current && dismissible)) {
      return
    }

    const yPosition = event.clientY - pointerStartRef.current.y
    const xPosition = event.clientX - pointerStartRef.current.x

    const clamp = y === "top" ? Math.min : Math.max
    const clampedY = clamp(0, yPosition)

    const swipeStartThreshold = event.pointerType === "touch" ? 10 : 2
    const isAllowedToSwipe = Math.abs(clampedY) > swipeStartThreshold

    if (isAllowedToSwipe) {
      toastRef.current?.style.setProperty("--swipe-amount", `${yPosition}px`)
    } else if (Math.abs(xPosition) > swipeStartThreshold) {
      // User is swiping in wrong direction so we disable swipe gesture
      // for the current pointer down interaction
      pointerStartRef.current = null
    }
  }

  return (
    <li
      aria-live={toast.important ? "assertive" : "polite"}
      aria-atomic="true"
      role="status"
      ref={toastRef}
      className={cx(
        className,
        toastClassname,
        classNames?.toast,
        toast?.classNames?.toast,
        classNames?.default,
        classNames?.[toastType],
        toast?.classNames?.[toastType]
      )}
      data-sonner-toast=""
      data-rich-colors={toast.richColors ?? defaultRichColors}
      data-styled={!toast.jsx || toast.unstyled || unstyled}
      data-mounted={mounted}
      data-promise={Boolean(toast.promise)}
      data-removed={removed}
      data-visible={isVisible}
      data-y-position={y}
      data-x-position={x}
      data-index={index}
      data-front={isFront}
      data-swiping={swiping}
      data-dismissible={dismissible}
      data-type={toastType}
      data-invert={invert}
      data-swipe-out={swipeOut}
      data-expanded={Boolean(expanded || (expandByDefault && mounted))}
      style={
        {
          "--index": index,
          "--toasts-before": index,
          "--z-index": toasts.length - index,
          "--offset": `${removed ? offsetBeforeRemove : offset.current}px`,
          "--initial-height": expandByDefault ? "auto" : `${initialHeight}px`,
          ...style,
          ...toast.style,
        } as React.CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
    >
      {closeButton && !toast.jsx && (
        <button
          aria-label={closeButtonAriaLabel}
          data-disabled={disabled}
          data-close-button={true}
          onClick={
            disabled || !dismissible
              ? undefined
              : () => {
                  deleteToast()
                  toast.onDismiss?.(toast)
                }
          }
          className={cx(classNames?.closeButton, toast?.classNames?.closeButton)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
            />
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
            />
          </svg>
        </button>
      )}

      {toast.jsx || React.isValidElement(toast.title) ? (
        toast.jsx || toast.title
      ) : (
        <>
          {toastType ||
            toast.icon ||
            (toast.promise && (
              <div
                data-icon=""
                className={cx(classNames?.icon, toast?.classNames?.icon)}
              >
                {toast.promise || (toast.type === "loading" && !toast.icon) ? toast.icon || getLoadingIcon() : null}
                {toast.type !== "loading" ? toast.icon || icons?.[toastType] || getAsset(toastType) : null}
              </div>
            ))}

          <div
            data-content=""
            className={cx(classNames?.content, toast?.classNames?.content)}
          >
            <div
              data-title=""
              className={cx(classNames?.title, toast?.classNames?.title)}
            >
              {toast.title}
            </div>
            {toast.description ? (
              <div
                data-description=""
                className={cx(
                  descriptionClassName,
                  toastDescriptionClassname,
                  classNames?.description,
                  toast?.classNames?.description
                )}
              >
                {toast.description}
              </div>
            ) : null}
          </div>
          {React.isValidElement(toast.cancel) ? (
            toast.cancel
          ) : toast.cancel && isAction(toast.cancel) ? (
            <button
              data-button={true}
              data-cancel={true}
              style={toast.cancelButtonStyle || cancelButtonStyle}
              onClick={(event) => {
                // We need to check twice because typescript
                if (!isAction(toast.cancel)) {
                  return
                }
                if (!dismissible) {
                  return
                }
                toast.cancel.onClick?.(event)
                deleteToast()
              }}
              className={cx(classNames?.cancelButton, toast?.classNames?.cancelButton)}
            >
              {toast.cancel.label}
            </button>
          ) : null}
          {React.isValidElement(toast.action) ? (
            toast.action
          ) : toast.action && isAction(toast.action) ? (
            <button
              data-button={true}
              data-action={true}
              style={toast.actionButtonStyle || actionButtonStyle}
              onClick={(event) => {
                // We need to check twice because typescript
                if (!isAction(toast.action)) {
                  return
                }
                if (event.defaultPrevented) {
                  return
                }
                toast.action.onClick?.(event)
                deleteToast()
              }}
              className={cx(classNames?.actionButton, toast?.classNames?.actionButton)}
            >
              {toast.action.label}
            </button>
          ) : null}
        </>
      )}
    </li>
  )
}
