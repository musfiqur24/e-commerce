'use client'

import React, { useEffect } from 'react'
import { CheckCircleSolid, XCircleSolid, ExclamationCircleSolid, InformationCircleSolid } from '@medusajs/icons'

interface ToastProps {
  isOpen: boolean
  onClose: () => void
  message: string
  variant?: "info" | "success" | "warning" | "error"
}

export default function Toast({ 
  isOpen, 
  onClose, 
  message, 
  variant = "success" 
}: ToastProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const icons = {
    success: <CheckCircleSolid className="w-5 h-5 text-emerald-500" />,
    error: <XCircleSolid className="w-5 h-5 text-red-500" />,
    warning: <ExclamationCircleSolid className="w-5 h-5 text-amber-500" />,
    info: <InformationCircleSolid className="w-5 h-5 text-blue-500" />,
  }

  return (
    <div className="fixed top-6 right-6 z-100 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-neutral-200 bg-white shadow-sm min-w-75">
        <div className="shrink-0 flex items-center justify-center">
          {icons[variant]}
        </div>
        <p className="text-[14.5px] font-medium text-neutral-800">
          {message}
        </p>
      </div>
    </div>
  )
}
