import { useEffect, useState } from 'react'
import { useNotification } from '../../hooks/notificationHook'

export const useClipboardImage = (enable: boolean) => {
    const [image, setImage] = useState<File | null>(null)
    const { createNotification } = useNotification()

    useEffect(() => {
        if (!enable) return

        const listener = (e: ClipboardEvent) => {
            if (e.clipboardData) {
                const items = e.clipboardData.items
                if (!items) return
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        const blob = items[i].getAsFile()
                        if (!blob) {
                            continue
                        }
                        setImage(blob)
                        e.preventDefault()
                        createNotification('Image pasted', { type: 'success' })
                        break
                    }
                }
            }
        }

        document.addEventListener('paste', listener, false)

        return () => {
            document.removeEventListener('paste', listener, false)
        }
    }, [enable])

    return image
}
