import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  ArrowUpTray,
  DocumentText,
  Link,
  Trash,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import type { ChangeEvent } from "react"

type ProductPdf = {
  url: string
  file_name: string
  file_id?: string
  uploaded_at?: string
}

type ProductData = {
  id: string
  metadata?: Record<string, unknown> | null
}

const PDF_METADATA_KEY = "product_pdf"

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const readProductPdf = (
  metadata?: Record<string, unknown> | null
): ProductPdf | null => {
  const value = metadata?.[PDF_METADATA_KEY]

  if (!isRecord(value) || typeof value.url !== "string") {
    return null
  }

  return {
    url: value.url,
    file_name:
      typeof value.file_name === "string" ? value.file_name : "Product PDF",
    file_id: typeof value.file_id === "string" ? value.file_id : undefined,
    uploaded_at:
      typeof value.uploaded_at === "string" ? value.uploaded_at : undefined,
  }
}

const deleteUploadedFile = async (fileId?: string) => {
  if (!fileId) {
    return
  }

  await fetch(`/admin/uploads/${fileId}`, {
    method: "DELETE",
  }).catch(() => undefined)
}

const ProductPdfWidget = ({ data }: { data: ProductData }) => {
  const [metadata, setMetadata] = useState<Record<string, unknown>>(
    isRecord(data.metadata) ? data.metadata : {}
  )
  const [pdf, setPdf] = useState<ProductPdf | null>(() =>
    readProductPdf(data.metadata)
  )
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const prompt = usePrompt()

  useEffect(() => {
    let active = true

    fetch(`/admin/products/${data.id}?fields=metadata`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) {
          return
        }

        const nextMetadata = isRecord(json?.product?.metadata)
          ? json.product.metadata
          : {}

        setMetadata(nextMetadata)
        setPdf(readProductPdf(nextMetadata))
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [data.id])

  const updateProductMetadata = async (nextPdf: ProductPdf | null) => {
    const nextMetadata = { ...metadata }

    if (nextPdf) {
      nextMetadata[PDF_METADATA_KEY] = nextPdf
    } else {
      delete nextMetadata[PDF_METADATA_KEY]
    }

    const res = await fetch(`/admin/products/${data.id}?fields=metadata`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metadata: nextMetadata,
      }),
    })

    if (!res.ok) {
      const message = await res.text().catch(() => "")
      throw new Error(message || "Failed to update product PDF")
    }

    const json = await res.json().catch(() => null)
    const updatedMetadata = isRecord(json?.product?.metadata)
      ? json.product.metadata
      : nextMetadata

    setMetadata(updatedMetadata)
    setPdf(readProductPdf(updatedMetadata))
  }

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

      const previousFileId = pdf?.file_id
      const nextPdf: ProductPdf = {
        url: uploaded.url,
        file_name: file.name,
        file_id: typeof uploaded.id === "string" ? uploaded.id : undefined,
        uploaded_at: new Date().toISOString(),
      }

      await updateProductMetadata(nextPdf)
      await deleteUploadedFile(previousFileId)
      toast.success("Product PDF saved")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save PDF"
      toast.error("Failed to save PDF", { description: message })
    } finally {
      setSaving(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (file) {
      uploadPdf(file)
    }
  }

  const removePdf = async () => {
    if (!pdf) {
      return
    }

    const confirmed = await prompt({
      title: "Remove Product PDF",
      description: "This removes the PDF from the product.",
      confirmText: "Remove",
      cancelText: "Cancel",
    })

    if (!confirmed) {
      return
    }

    setSaving(true)

    try {
      const previousFileId = pdf.file_id
      await updateProductMetadata(null)
      await deleteUploadedFile(previousFileId)
      toast.success("Product PDF removed")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove PDF"
      toast.error("Failed to remove PDF", { description: message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <div className="flex items-center gap-x-3">
          <div className="shadow-borders-base flex size-7 items-center justify-center rounded-md">
            <DocumentText className="text-ui-fg-subtle" />
          </div>
          <div>
            <Heading level="h2">Product PDF</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Attach one PDF to this product.
            </Text>
          </div>
        </div>
        <Button
          size="small"
          variant="secondary"
          type="button"
          isLoading={saving}
          disabled={saving}
          onClick={() => inputRef.current?.click()}
        >
          <ArrowUpTray />
          {pdf ? "Replace" : "Upload"}
        </Button>
      </div>

      <div className="px-6 py-4">
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="application/pdf,.pdf"
          onChange={onFileChange}
        />

        {pdf ? (
          <div className="flex items-center justify-between gap-x-4">
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
                  title={pdf.file_name}
                >
                  {pdf.file_name}
                </Text>
                {pdf.uploaded_at && (
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    Uploaded {new Date(pdf.uploaded_at).toLocaleDateString()}
                  </Text>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-x-2">
              <Button size="small" variant="secondary" asChild>
                <a href={pdf.url} target="_blank" rel="noreferrer">
                  <Link />
                  Open
                </a>
              </Button>
              <Button
                size="small"
                variant="secondary"
                type="button"
                className="text-ui-fg-error"
                disabled={saving}
                onClick={removePdf}
              >
                <Trash />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover focus-visible:shadow-borders-focus flex w-full flex-col items-center justify-center gap-y-2 rounded-lg border border-dashed px-6 py-8 outline-none transition-fg"
            disabled={saving}
            onClick={() => inputRef.current?.click()}
          >
            <ArrowUpTray className="text-ui-fg-subtle" />
            <Text size="small" weight="plus">
              Upload PDF
            </Text>
            <Text size="xsmall" className="text-ui-fg-muted">
              One PDF can be attached to each product.
            </Text>
          </button>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductPdfWidget
