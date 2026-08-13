import { Upload } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'

interface FileDropzoneProps {
  accept: string
  label: string
  hint: string
  /** Allow selecting/dropping more than one file at once. Defaults to false. */
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
}

export function FileDropzone({
  accept,
  label,
  hint,
  multiple = false,
  onFilesSelected
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onFilesSelected(multiple ? Array.from(files) : [files[0]])
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex min-h-[9.5rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
        isDragging
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
          : 'border-ink/15 hover:border-ink/25 dark:border-paper/15 dark:hover:border-paper/25'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          // Reset the input so selecting the same file(s) again still fires
          // onChange (e.g. after removing and re-adding one).
          e.target.value = ''
        }}
      />
      <Upload className="mb-3 h-6 w-6 text-ink/40 dark:text-paper/40" strokeWidth={1.75} />
      <p className="text-sm font-medium text-ink dark:text-paper">{label}</p>
      <p className="mt-1 text-xs text-ink/50 dark:text-paper/50">{hint}</p>
    </div>
  )
}
