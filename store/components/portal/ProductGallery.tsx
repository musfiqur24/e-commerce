'use client'

import { useEffect, useRef, useState } from 'react'

export const PRODUCT_SLIDE_INTERVAL_MS = 4000

export default function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState<string[]>([])
  const container = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const visible = useRef(true)
  const opener = useRef<HTMLButtonElement>(null)
  const urls = [...new Set(images.filter(Boolean))].filter(url => !failed.includes(url))
  const count = urls.length
  const current = count ? index % count : 0
  const multiple = count > 1

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting })
    if (container.current) observer.observe(container.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!multiple || paused || open) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const timer = window.setInterval(() => {
      if (visible.current && !document.hidden && !motion.matches) setIndex(value => (value + 1) % count)
    }, PRODUCT_SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [count, multiple, paused, open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])

  const close = () => { dialog.current?.close(); setOpen(false); opener.current?.focus() }
  const show = () => { if (multiple) { dialog.current?.showModal(); setOpen(true) } }
  const move = (direction: number) => setIndex(value => (value + direction + count) % count)
  const picture = count ? <img src={urls[current]} alt={`${name} — image ${current + 1} of ${count}`} loading="lazy" className="size-full object-cover" onError={() => setFailed(value => [...value, urls[current]])} /> : <div className="flex size-full items-center justify-center bg-neutral-100 text-sm text-neutral-500">No image available</div>

  return <div ref={container} className="relative h-64.75 w-full shrink-0 overflow-hidden rounded-md bg-neutral-100"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
    {multiple ? <button ref={opener} type="button" onClick={show} aria-label={`View all ${count} images of ${name}`} className="block size-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px]">{picture}</button> : picture}
    {multiple && <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/30 px-2 py-1" aria-label="Product images">
      {urls.map((url, position) => <button type="button" key={url} aria-label={`Show image ${position + 1}`} aria-pressed={position === current} className="flex size-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white" onClick={() => setIndex(position)}><span className={`size-1.5 rounded-full ${position === current ? 'bg-white' : 'bg-white/50'}`} /></button>)}
    </div>}
    <dialog ref={dialog} aria-label={`${name} image gallery`} onCancel={close} onClose={() => setOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) close() }}
      onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); move(1) } if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) } }}
      className="fixed inset-0 m-auto max-h-[90vh] w-[min(94vw,960px)] overflow-y-auto rounded-xl bg-white p-4 shadow-xl backdrop:bg-black/70 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-medium">{name}</h2><button type="button" onClick={close} autoFocus aria-label="Close image gallery" className="rounded-md px-3 py-2 hover:bg-neutral-100">✕</button></div>
      <div className="relative flex h-[min(55vh,560px)] items-center justify-center rounded-lg bg-neutral-50">
        {count > 0 && <img src={urls[current]} alt={`${name} — image ${current + 1}`} className="max-h-full max-w-full object-contain" />}
        {multiple && <><button type="button" onClick={() => move(-1)} aria-label="Previous image" className="absolute left-2 rounded-full bg-white/90 px-4 py-3 shadow">‹</button><button type="button" onClick={() => move(1)} aria-label="Next image" className="absolute right-2 rounded-full bg-white/90 px-4 py-3 shadow">›</button></>}
      </div>
      <p className="my-3 text-center text-sm text-neutral-500" aria-live="polite">{current + 1} / {count}</p>
      <div className="flex flex-wrap justify-center gap-3">{urls.map((url, position) => <button key={url} type="button" onClick={() => setIndex(position)} aria-label={`View image ${position + 1}`} aria-pressed={position === current} className={`size-20 overflow-hidden rounded-md border-2 ${position === current ? 'border-neutral-900' : 'border-transparent'}`}><img src={url} alt={`${name} thumbnail ${position + 1}`} loading="lazy" className="size-full object-cover" /></button>)}</div>
    </dialog>
  </div>
}
