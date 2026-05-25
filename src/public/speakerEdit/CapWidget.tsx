import * as React from 'react'
import { useEffect, useRef } from 'react'
// Side-effect import: registers the <cap-widget> custom element on
// `window.customElements`. The widget is now bundled from the
// `@cap.js/widget` npm package (pinned in package.json) so the script
// is served from our own deploy instead of a third-party CDN — closes
// the supply-chain vector that the previous jsdelivr <script> opened.
import '@cap.js/widget'
import { CAP_API_ENDPOINT } from '../../env'

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'cap-widget': React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement> & { 'data-cap-api-endpoint'?: string },
                HTMLElement
            >
        }
    }
}

export type CapWidgetProps = {
    onSolve: (token: string) => void
    onReset?: () => void
}

export const CapWidget = ({ onSolve, onReset }: CapWidgetProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!containerRef.current) return
        const widgetEl = document.createElement('cap-widget')
        widgetEl.setAttribute('data-cap-api-endpoint', CAP_API_ENDPOINT)

        const handleSolve = (e: Event) => {
            const detail = (e as CustomEvent<{ token?: string }>).detail
            if (detail?.token) onSolve(detail.token)
        }
        const handleReset = () => onReset?.()

        widgetEl.addEventListener('solve', handleSolve as EventListener)
        widgetEl.addEventListener('reset', handleReset as EventListener)
        containerRef.current.appendChild(widgetEl)

        return () => {
            widgetEl.removeEventListener('solve', handleSolve as EventListener)
            widgetEl.removeEventListener('reset', handleReset as EventListener)
            widgetEl.remove()
        }
    }, [])

    return <div ref={containerRef} />
}
