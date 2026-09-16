import { ArrowDownTray, DocumentText, Link, Trash } from "@medusajs/icons"
import { Badge, Button, Text, clx, toast } from "@medusajs/ui"
import { useRef, useState } from "react"
import type { ChangeEvent, DragEvent } from "react"

export type ProductPdf = {
  url: string
  file_name: string
  file_id?: string
  uploaded_at?: string
}

type ProductPdfFieldProps = {
  value?: ProductPdf | null
  onChange: (value: ProductPdf | null) => void
}

export const ProductPdfField = ({ value, onChange }: ProductPdfFieldProps) => {
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadPdf = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Only PDF files can be uploaded")
      return
    }

    setSaving(true)

    try {
      const form = new FormData()
      form.append("files", file)

      const uploadRes = await fetch("/admin/uploads", {
        method: "POST",
        body: form,
      })

      if (!uploadRes.ok) {
        const message = await uploadRes.text().catch(() => "")
        throw new Error(message || "Failed to upload PDF")
      }

      const uploadJson = await uploadRes.json()
      const uploaded = uploadJson?.files?.[0]

      if (!uploaded?.url) {
        throw new Error("Upload completed, but no PDF URL was returned")
      }

      onChange({
        url: uploaded.url,
        file_name: file.name,
        file_id: typeof uploaded.id === "string" ? uploaded.id : undefined,
        uploaded_at: new Date().toISOString(),
      })

      toast.success("Product PDF ready to save")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload PDF"
      toast.error("Failed to upload PDF", { description: message })
    } finally {
      setSaving(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  const handleFile = (file?: File) => {
    if (file) {
      uploadPdf(file)
    }
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0])
  }

  const onDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => {
    setDragOver(false)
  }

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragOver(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  return (
    <div className="flex flex-col gap-y-3">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="application/pdf,.pdf"
        onChange={onFileChange}
      />

      {value ? (
        <div className="bg-ui-bg-component shadow-elevation-card-rest flex items-center justify-between gap-x-4 rounded-lg px-3 py-2">
          <div className="flex min-w-0 items-center gap-x-3">
            <Badge color="blue">
              <DocumentText />
              PDF
            </Badge>
            <div className="min-w-0">
              <Text
                size="small"
                weight="plus"
                className="truncate"
                title={value.file_name}
              >
                {value.file_name}
              </Text>
              {value.uploaded_at && (
                <Text size="xsmall" className="text-ui-fg-subtle">
                  Uploaded {new Date(value.uploaded_at).toLocaleDateString()}
                </Text>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-x-2">
            <Button size="small" variant="secondary" asChild>
              <a href={value.url} target="_blank" rel="noreferrer">
                <Link />
                Open
              </a>
            </Button>
            <Button
              size="small"
              variant="secondary"
              type="button"
              disabled={saving}
              onClick={() => inputRef.current?.click()}
            >
              <ArrowDownTray />
              Replace
            </Button>
            <Button
              size="small"
              variant="secondary"
              type="button"
              className="text-ui-fg-error"
              disabled={saving}
              onClick={() => onChange(null)}
            >
              <Trash />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={clx(
            "bg-ui-bg-component border-ui-border-strong transition-fg group flex w-full flex-col items-center gap-y-2 rounded-lg border border-dashed p-8",
            "hover:border-ui-border-interactive focus:border-ui-border-interactive",
            "focus:shadow-borders-focus outline-none focus:border-solid",
            {
              "border-ui-border-interactive": dragOver,
            }
          )}
          disabled={saving}
          onClick={() => inputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <ArrowDownTray className="text-ui-fg-muted" />
          <Text size="small" leading="compact" weight="plus">
            Upload PDF
          </Text>
          <Text size="small" leading="compact" className="text-ui-fg-muted">
            Drag and drop PDF here or click to upload.
          </Text>
        </button>
      )}
    </div>
  )
}
