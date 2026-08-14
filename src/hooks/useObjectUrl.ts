import { useEffect, useMemo } from 'react'

/** Creates an object URL for a Blob and revokes it when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}
