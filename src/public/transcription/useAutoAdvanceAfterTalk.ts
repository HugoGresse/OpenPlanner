import { useEffect } from 'react'
import { DateTime } from 'luxon'

const ADVANCE_DELAY_MS = 5 * 60 * 1000
// setTimeout delays above 2^31-1 ms overflow and fire immediately — ignore anything that far out.
const MAX_TIMEOUT_MS = 2 ** 31 - 1

// Advances to the next talk 5 minutes after the current one ends, so the caption screen rolls over
// without anyone touching the machine.
export const useAutoAdvanceAfterTalk = (talkEndIso: string | undefined, onAdvance: () => void) => {
    useEffect(() => {
        if (!talkEndIso) return
        const end = DateTime.fromISO(talkEndIso)
        if (!end.isValid) return

        const delay = end.toMillis() + ADVANCE_DELAY_MS - DateTime.now().toMillis()
        if (delay > MAX_TIMEOUT_MS) return

        if (delay <= 0) {
            onAdvance()
            return
        }

        const timer = setTimeout(onAdvance, delay)
        return () => clearTimeout(timer)
    }, [talkEndIso, onAdvance])
}
