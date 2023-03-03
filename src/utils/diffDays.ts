import { DateTime } from 'luxon'

export const diffDays = (start: string | null, end: string | null): number => {
    if (!start || !end) {
        return 0
    }
    const startTime = DateTime.fromISO(start)
    const endTime = DateTime.fromISO(end)

    const diff = endTime.diff(startTime, 'days').toObject()

    return Math.ceil(diff.days || 0)
}
