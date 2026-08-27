import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose(): void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  return (
    <dialog
      aria-labelledby="result-dialog-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(720px,calc(100%-1.5rem))] overflow-y-auto rounded-[2rem] border border-stone-300 bg-[#f8f5ed] p-0 text-stone-950 shadow-2xl backdrop:bg-stone-950/65"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClose={onClose}
      ref={ref}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-300 bg-[#f8f5ed]/95 px-5 py-4 backdrop-blur sm:px-7">
        <h2 className="font-serif text-2xl" id="result-dialog-title">{title}</h2>
        <button aria-label="Close dialog" className="grid size-11 place-items-center rounded-full hover:bg-stone-200" onClick={onClose} type="button"><X aria-hidden="true" className="size-5" /></button>
      </div>
      <div className="p-4 sm:p-7">{children}</div>
    </dialog>
  )
}
