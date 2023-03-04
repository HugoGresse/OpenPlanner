import { DateTime } from 'luxon'

export const diffDays = (start: string | Date | null, end: string | Date | null): number => {
    if (!start || !end) {
        return 0
    }
    const startTime = start instanceof Date ? DateTime.fromJSDate(start) : DateTime.fromISO(start)
    const endTime = end instanceof Date ? DateTime.fromJSDate(end) : DateTime.fromISO(end)

    const diff = endTime.diff(startTime, 'days').toObject()

    return Math.ceil(diff.days || 0)
}
