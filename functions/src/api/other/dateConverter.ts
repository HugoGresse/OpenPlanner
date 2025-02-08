import { Timestamp } from 'firebase/firestore'
import { DateTime } from 'luxon'

export const dateToString = (date: Timestamp | Date | DateTime | string | null | undefined): string => {
    if (!date) {
        return ''
    }
    return unknownToDateTime(date).toISO() || ''
}

export const unknownToDateTime = (date: Timestamp | Date | DateTime | string | null | undefined): DateTime => {
    if (!date) {
        return DateTime.now()
    }
    if (typeof date === 'string') {
        return DateTime.fromISO(date)
    }
    if (date instanceof Date) {
        return DateTime.fromJSDate(date)
    }
    if ('toISO' in date) {
        // Already a DateTime object
        return date as DateTime
    }
    // Firestore Timestamp
    return DateTime.fromJSDate(date.toDate())
}
