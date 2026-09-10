import { useEffect } from 'react'

type Disposable = { dispose: () => void }

/** React Three Fiber cannot own resources passed in through material/geometry props. */
export function useDispose(resource: Disposable | (Disposable | null)[] | null) {
  useEffect(() => () => {
    const resources = Array.isArray(resource) ? resource : [resource]
    new Set(resources).forEach((item) => item?.dispose())
  }, [resource])
}
