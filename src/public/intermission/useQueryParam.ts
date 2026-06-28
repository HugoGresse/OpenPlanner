import { useState } from 'react'

/**
 * Small string-valued query-param state. Reads the initial value from the URL and writes changes
 * back via history.replaceState (no navigation), so the picked options are shareable/bookmarkable.
 * Each setter reads the current search fresh, so independent params don't clobber each other.
 */
export const useQueryParam = (key: string, defaultValue: string): [string, (value: string) => void] => {
    const [value, setValue] = useState<string>(() => {
        if (typeof window === 'undefined') return defaultValue
        const params = new URLSearchParams(window.location.search)
        return params.has(key) ? (params.get(key) as string) : defaultValue
    })

    const set = (next: string) => {
        setValue(next)
        if (typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        if (next === '' || next === null || next === undefined) {
            params.delete(key)
        } else {
            params.set(key, next)
        }
        const qs = params.toString()
        window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
    }

    return [value, set]
}
