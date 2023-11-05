import { useHotkeys } from 'react-hotkeys-hook'
import { useRef } from 'react'

export const SaveShortcut = () => {
    const ref = useRef(null)
    useHotkeys(['ctrl+s', 'meta+s'], (event) => {
        event.preventDefault()
        // @ts-ignore
        const form = ref.current?.closest('form')
        if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }
    })

    return <div ref={ref}></div>
}
