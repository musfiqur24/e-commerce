'use client'

import React, { useEffect, useId, useRef, useState } from 'react'
import {
  CloudArrowUp,
  TrianglesMini,
  XMarkMini,
} from '@medusajs/icons'

export interface TicketCategoryOption {
  label: string
  value: string
}

interface CreateTicketModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (
    subject: string,
    content: string,
    categoryValue: string,
    attachmentFileIds: string[],
  ) => Promise<boolean>
  isSubmitting: boolean
  categoryOptions: TicketCategoryOption[]
  isLoadingCategories: boolean
  categoryError?: string
}

const MAX_FILES = 5
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export default function CreateTicketModal({
  isOpen,
  onClose,
  onCreate,
  isSubmitting,
  categoryOptions,
  isLoadingCategories,
  categoryError,
}: CreateTicketModalProps) {
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [categoryValue, setCategoryValue] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [formError, setFormError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLDivElement>(null)
  const categoryListId = useId()
  const isBusy = isSubmitting || isUploading

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        if (isCategoryOpen) {
          setIsCategoryOpen(false)
        } else {
          onClose()
        }
      }
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (
        isCategoryOpen &&
        categoryRef.current &&
        !categoryRef.current.contains(event.target as Node)
      ) {
        setIsCategoryOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isBusy, isCategoryOpen, isOpen, onClose])

  if (!isOpen) return null

  const selectedCategory = categoryOptions.find(
    (option) => option.value === categoryValue,
  )
  const filteredCategories = categoryOptions.filter((option) =>
    option.label.toLowerCase().includes(categorySearch.trim().toLowerCase()),
  )
  const canSubmit =
    subject.trim().length > 0 &&
    content.trim().length > 0 &&
    categoryValue.length > 0 &&
    !isBusy

  const addFiles = (incomingFiles: File[]) => {
    setFormError('')

    const oversizedFile = incomingFiles.find(
      (file) => file.size > MAX_FILE_SIZE_BYTES,
    )
    if (oversizedFile) {
      setFormError(`${oversizedFile.name} is larger than 10 MB.`)
      return
    }

    setFiles((currentFiles) => {
      const uniqueFiles = [...currentFiles]
      for (const file of incomingFiles) {
        const isDuplicate = uniqueFiles.some(
          (current) =>
            current.name === file.name &&
            current.size === file.size &&
            current.lastModified === file.lastModified,
        )
        if (!isDuplicate) uniqueFiles.push(file)
      }

      if (uniqueFiles.length > MAX_FILES) {
        setFormError(`You can attach up to ${MAX_FILES} files.`)
        return uniqueFiles.slice(0, MAX_FILES)
      }

      return uniqueFiles
    })
  }

  const uploadAttachments = async () => {
    return Promise.all(
      files.map(async (file) => {
        const body = new FormData()
        body.append('file', file)

        const response = await fetch('/api/support/attachments', {
          method: 'POST',
          body,
        })
        const result = (await response.json()) as {
          id?: string
          error?: string
        }

        if (!response.ok || !result.id) {
          throw new Error(result.error || `Failed to upload ${file.name}`)
        }

        return result.id
      }),
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    setFormError('')
    setIsUploading(files.length > 0)

    try {
      const attachmentFileIds = files.length
        ? await uploadAttachments()
        : []
      setIsUploading(false)

      const created = await onCreate(
        subject.trim(),
        content.trim(),
        categoryValue,
        attachmentFileIds,
      )
      if (!created) return

      setSubject('')
      setContent('')
      setCategoryValue('')
      setFiles([])
      setCategorySearch('')
      setIsCategoryOpen(false)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'The attachments could not be uploaded.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ticket-title"
        className="relative flex w-full max-w-[343px] flex-col overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.08),0_16px_32px_rgba(0,0,0,0.08),inset_0_0_0_1px_white,inset_0_0_0_1.5px_rgba(228,228,231,0.6)] sm:max-w-[560px]"
      >
        <header className="flex h-[54px] shrink-0 items-center gap-2 border-b border-[#e0e0e0] px-3 py-3 sm:h-[62px] sm:px-6 sm:py-4">
          <h2
            id="create-ticket-title"
            className="flex-1 text-lg font-medium leading-[1.6] text-[#1c1c1c]"
          >
            Create New Ticket
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close create ticket modal"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-[#1c1c1c] transition-colors hover:bg-[#f5f5f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XMarkMini className="size-3.75" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex flex-col gap-3 bg-white p-3 sm:gap-4 sm:px-6 sm:pb-6 sm:pt-4">
            <div ref={categoryRef} className="relative z-10">
              <button
                type="button"
                role="combobox"
                aria-expanded={isCategoryOpen}
                aria-controls={categoryListId}
                aria-haspopup="listbox"
                disabled={isBusy || isLoadingCategories || !!categoryError}
                onClick={() => setIsCategoryOpen((open) => !open)}
                className="flex h-8 w-full items-center overflow-hidden rounded-md border-[0.75px] border-[#e0e0e0] bg-[#f9f9f9] pl-2 text-left sm:h-9 sm:pl-3"
              >
                <span
                  className={`min-w-0 flex-1 truncate text-[13px] font-normal leading-[1.1] ${
                    selectedCategory ? 'text-[#1c1c1c]' : 'text-[#8d8d8d]'
                  }`}
                >
                  {isLoadingCategories
                    ? 'Loading categories…'
                    : categoryError
                      ? 'Categories unavailable'
                      : selectedCategory?.label || 'Category'}
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <TrianglesMini className="size-3.75 text-[#757575]" />
                </span>
              </button>

              {isCategoryOpen && (
                <div
                  id={categoryListId}
                  role="listbox"
                  className="absolute right-0 top-[calc(100%+4px)] z-20 w-full overflow-hidden rounded-lg bg-white p-1 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.08)] sm:w-[280px]"
                >
                  <div className="border-b border-[#e0e0e0] pb-1">
                    <input
                      type="search"
                      autoFocus
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                      placeholder="Search options"
                      aria-label="Search ticket categories"
                      className="h-8 w-full rounded px-2 text-[13px] font-normal leading-[1.1] text-[#1c1c1c] outline-none placeholder:text-[#8d8d8d] focus:bg-[#f9f9f9]"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto pt-1">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          role="option"
                          aria-selected={categoryValue === option.value}
                          onClick={() => {
                            setCategoryValue(option.value)
                            setIsCategoryOpen(false)
                            setCategorySearch('')
                          }}
                          className={`flex h-7 w-full items-center rounded px-2 text-left text-[13px] font-normal leading-[1.1] transition-colors hover:bg-[#f5f5f5] ${
                            categoryValue === option.value
                              ? 'bg-[#f5f5f5] text-[#1c1c1c]'
                              : 'text-[#1c1c1c]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-2 text-[13px] leading-[1.1] text-[#8d8d8d]">
                        No categories found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <input
              type="text"
              name="subject"
              placeholder="Ticket Title"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              disabled={isBusy}
              className="h-8 w-full rounded-md border-[0.75px] border-[#e0e0e0] bg-[#f9f9f9] px-2 text-[13px] font-normal leading-[1.1] text-[#1c1c1c] outline-none transition-shadow placeholder:text-[#8d8d8d] focus:shadow-[0_0_0_1px_#757575] disabled:opacity-60"
            />

            <textarea
              placeholder="Ticket Description"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              disabled={isBusy}
              className="h-[54px] min-h-[54px] w-full resize-y rounded-md bg-[#f9f9f9] px-2 py-1.5 text-[13px] font-normal leading-[1.6] text-[#1c1c1c] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)] transition-shadow placeholder:text-[#8d8d8d] focus:shadow-[0_0_0_1px_#757575] disabled:opacity-60"
            />

            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={(event) => {
                  addFiles(Array.from(event.target.files ?? []))
                  event.target.value = ''
                }}
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  event.preventDefault()
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setIsDragging(false)
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  addFiles(Array.from(event.dataTransfer.files))
                }}
                className={`flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-[#f9f9f9] px-8 py-6 transition-colors ${
                  isDragging
                    ? 'border-[#1c1c1c] bg-[#f5f5f5]'
                    : 'border-[#bdbdbd] hover:border-[#757575]'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className="flex items-center gap-2 text-[13px] font-normal leading-[1.6] text-[#1c1c1c]">
                  <CloudArrowUp className="size-3.75" />
                  Upload Files
                </span>
                <span className="text-center text-[13px] font-normal leading-[1.6] text-[#8d8d8d]">
                  Drag and drop files here or click to upload
                </span>
              </button>

              {files.length > 0 && (
                <ul className="mt-2 space-y-1" aria-label="Selected attachments">
                  {files.map((file) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex h-8 items-center gap-2 rounded-md bg-[#f9f9f9] px-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] leading-[1.1] text-[#1c1c1c]">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFiles((current) =>
                            current.filter((candidate) => candidate !== file),
                          )
                        }
                        disabled={isBusy}
                        aria-label={`Remove ${file.name}`}
                        className="flex size-6 items-center justify-center rounded text-[#757575] hover:bg-[#e0e0e0] hover:text-[#1c1c1c]"
                      >
                        <XMarkMini className="size-3.75" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {(formError || categoryError) && (
                <p role="alert" className="mt-2 text-xs leading-4 text-[#b72b05]">
                  {formError || categoryError}
                </p>
              )}
            </div>
          </div>

          <footer className="flex h-16 shrink-0 items-center border-t border-[#e0e0e0] bg-white p-3 sm:h-[61px] sm:justify-end sm:px-6 sm:py-4">
            <div className="flex w-full gap-4 sm:w-auto sm:gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="flex h-[39px] flex-1 items-center justify-center rounded-md bg-white px-5 text-sm font-medium leading-[1.1] text-[#1c1c1c] shadow-[0_1px_2px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)] transition-colors hover:bg-[#f9f9f9] disabled:cursor-not-allowed disabled:opacity-50 sm:h-7 sm:flex-none sm:px-2 sm:text-[13px] sm:font-normal"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-[39px] flex-1 items-center justify-center rounded-md bg-[#2e2f2f] px-5 text-sm font-medium leading-[1.1] text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),0_0_0_1px_#18181b,inset_0_0.75px_0_rgba(255,255,255,0.2)] transition-colors hover:bg-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-50 sm:h-7 sm:flex-none sm:px-2 sm:text-[13px] sm:font-normal"
              >
                {isUploading
                  ? 'Uploading…'
                  : isSubmitting
                    ? 'Creating…'
                    : 'Create'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}
