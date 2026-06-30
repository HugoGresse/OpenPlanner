import { useEffect } from 'react'
import { DateTime } from 'luxon'

const RELOAD_DELAY_MS = 5 * 60 * 1000
// setTimeout delays above 2^31-1 ms overflow and fire immediately — ignore anything that far out.
const MAX_TIMEOUT_MS = 2 ** 31 - 1

// Reloads the page 5 minutes after the current talk ends, so the caption screen rolls over to the next
// talk and opens a fresh Gladia session without anyone touching the machine.
export const useAutoReloadAfterTalk = (talkEndIso?: string) => {
    useEffect(() => {
        if (!talkEndIso) return
        const end = DateTime.fromISO(talkEndIso)
        if (!end.isValid) return

        const delay = end.toMillis() + RELOAD_DELAY_MS - DateTime.now().toMillis()
        if (delay <= 0 || delay > MAX_TIMEOUT_MS) return

        const timer = setTimeout(() => window.location.reload(), delay)
        return () => clearTimeout(timer)
    }, [talkEndIso])
}
