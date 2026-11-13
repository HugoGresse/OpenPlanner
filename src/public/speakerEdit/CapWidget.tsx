import * as React from 'react'
import { useEffect, useMemo, useRef } from 'react'
// Side-effect import: registers the <cap-widget> custom element on
// `window.customElements`. The widget is now bundled from the
// `@cap.js/widget` npm package (pinned in package.json) so the script
// is served from our own deploy instead of a third-party CDN — closes
// the supply-chain vector that the previous jsdelivr <script> opened.
import '@cap.js/widget'
import { useTheme } from '@mui/material/styles'
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

// CSS custom properties exposed by @cap.js/widget. The defaults shipped
// by the widget are tuned for light backgrounds; on a dark MUI theme
// they produce a near-white box that stands out aggressively against
// the surrounding surface. Override the colour vars (and ONLY the
// colour vars — sizing/radius stays on the widget defaults) based on
// the active MUI palette so the widget blends with the host page.
type CapColourVars = {
    '--cap-background': string
    '--cap-border-color': string
    '--cap-color': string
    '--cap-checkbox-background': string
    '--cap-checkbox-border': string
    '--cap-spinner-color': string
    '--cap-spinner-background-color': string
}

export const CapWidget = ({ onSolve, onReset }: CapWidgetProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'

    // Compute the CSS-var overrides once per theme flip rather than on
    // every render. Light values mirror the upstream widget defaults so
    // existing deployments keep their look; dark values pull from the
    // MUI palette so the widget tracks any user theme customisation.
    const colourVars = useMemo<CapColourVars>(
        () =>
            isDark
                ? {
                      '--cap-background': theme.palette.background.paper,
                      '--cap-border-color': theme.palette.divider,
                      '--cap-color': theme.palette.text.primary,
                      '--cap-checkbox-background': theme.palette.action.hover,
                      '--cap-checkbox-border': `1px solid ${theme.palette.divider}`,
                      '--cap-spinner-color': theme.palette.text.primary,
                      '--cap-spinner-background-color': theme.palette.action.disabledBackground,
                  }
                : {
                      '--cap-background': '#fdfdfd',
                      '--cap-border-color': '#dddddd8f',
                      '--cap-color': '#212121',
                      '--cap-checkbox-background': '#fafafa91',
                      '--cap-checkbox-border': '1px solid #aaaaaad1',
                      '--cap-spinner-color': '#000',
                      '--cap-spinner-background-color': '#eee',
                  },
        [isDark, theme.palette]
    )

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

    // CSS custom properties cascade from this container down to the
    // shadow-DOM-less <cap-widget> child, so the widget picks the
    // overrides up automatically without us reaching into its internals.
    return <div ref={containerRef} style={colourVars as React.CSSProperties} />
}
