"use client"

import "./styles.css"

import React from "react"
import { toast, ToastState } from "./state"
import { type ExternalToast, type ToasterProps, type ToastType } from "./types"
import { Toaster } from "./components/toaster"

function useSonner() {
  const [activeToasts, setActiveToasts] = React.useState<ToastType[]>([])

  React.useEffect(() => {
    return ToastState.subscribe((toast) => {
      setActiveToasts((currentToasts) => {
        if ("dismiss" in toast && toast.dismiss) {
          return currentToasts.filter((t) => t.id !== toast.id)
        }

        const existingToastIndex = currentToasts.findIndex((t) => t.id === toast.id)
        if (existingToastIndex !== -1) {
          const updatedToasts = [...currentToasts]
          updatedToasts[existingToastIndex] = { ...updatedToasts[existingToastIndex], ...toast }
          return updatedToasts
        } else {
          return [toast, ...currentToasts]
        }
      })
    })
  }, [])

  return {
    toasts: activeToasts,
  }
}

export { toast, Toaster, type ExternalToast, type ToastType, type ToasterProps, useSonner }
export { type ToastClassnames, type ToastToDismiss, type Action } from "./types"
