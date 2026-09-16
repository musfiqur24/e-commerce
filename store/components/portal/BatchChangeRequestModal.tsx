'use client'

import React, { useState, useEffect } from 'react'
import { XMark } from '@medusajs/icons'
import Button from './Button'

export interface FieldChange {
  fieldLabel: string
  fieldInternalName: string
  oldValue: string
  newValue: string
}

interface BatchChangeRequestModalProps {
  isOpen: boolean
  onClose: () => void
  changes: FieldChange[]
  onSubmit: (description: string) => Promise<void>
}

export default function BatchChangeRequestModal({
  isOpen,
  onClose,
  changes,
  onSubmit,
}: BatchChangeRequestModalProps) {
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) setDescription('')
  }, [isOpen])

  if (!isOpen || changes.length === 0) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(description.trim())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-100">
          <div>
            <h3 className="text-[15px] font-bold text-neutral-900">Request Changes</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Describe what you'd like to update. An admin will review your request.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors mt-0.5 shrink-0"
          >
            <XMark className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the changes you'd like to make..."
            rows={5}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 text-[13px] text-neutral-700 resize-none transition-all placeholder:text-neutral-300"
          />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-[13px] font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-8 bg-neutral-900 hover:bg-black text-white h-10 rounded-lg border-none text-[13px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
