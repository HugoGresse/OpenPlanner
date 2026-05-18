import * as React from 'react'
import { useEffect, useRef } from 'react'

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

const CAP_API_ENDPOINT = 'https://captcha.openplanner.fr/'
const CAP_WIDGET_SCRIPT = 'https://cdn.jsdelivr.net/npm/@cap.js/widget'

export type CapWidgetProps = {
    onSolve: (token: string) => void
    onReset?: () => void
}

let scriptLoaded = false

const ensureScript = (): Promise<void> => {
    if (scriptLoaded) return Promise.resolve()
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${CAP_WIDGET_SCRIPT}"]`)
        if (existing) {
            scriptLoaded = true
            resolve()
            return
        }
        const s = document.createElement('script')
        s.src = CAP_WIDGET_SCRIPT
        s.async = true
        s.onload = () => {
            scriptLoaded = true
            resolve()
        }
        s.onerror = () => reject(new Error('Failed to load Cap widget script'))
        document.head.appendChild(s)
    })
}

export const CapWidget = ({ onSolve, onReset }: CapWidgetProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        let cancelled = false
        let widgetEl: HTMLElement | null = null
        const handleSolve = (e: Event) => {
            const detail = (e as CustomEvent<{ token?: string }>).detail
            if (detail?.token) onSolve(detail.token)
        }
        const handleReset = () => onReset?.()

        ensureScript()
            .then(() => {
                if (cancelled || !containerRef.current) return
                widgetEl = document.createElement('cap-widget')
                widgetEl.setAttribute('data-cap-api-endpoint', CAP_API_ENDPOINT)
                widgetEl.addEventListener('solve', handleSolve as EventListener)
                widgetEl.addEventListener('reset', handleReset as EventListener)
                containerRef.current.appendChild(widgetEl)
            })
            .catch((err) => console.error(err))

        return () => {
            cancelled = true
            if (widgetEl) {
                widgetEl.removeEventListener('solve', handleSolve as EventListener)
                widgetEl.removeEventListener('reset', handleReset as EventListener)
                widgetEl.remove()
            }
        }
    }, [])

    return <div ref={containerRef} />
}
