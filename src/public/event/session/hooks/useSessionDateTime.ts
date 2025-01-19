import { useMemo } from 'react'
import { DateTime } from 'luxon'

export type SessionDateTime = {
    startTime: string | null
    endTime: string | null
    dayName: string | null
    date: string | null
    durationText: string
}

export const useSessionDateTime = (
    dateStart: string | null,
    dateEnd: string | null,
    durationMinutes?: number
): SessionDateTime => {
    return useMemo(() => {
        const startDateTime = dateStart ? DateTime.fromISO(dateStart).setLocale(navigator.language) : null
        const endDateTime = dateEnd ? DateTime.fromISO(dateEnd).setLocale(navigator.language) : null

        return {
            startTime: startDateTime?.toLocaleString(DateTime.TIME_SIMPLE) ?? null,
            endTime: endDateTime?.toLocaleString(DateTime.TIME_SIMPLE) ?? null,
            dayName: startDateTime?.toLocaleString({ weekday: 'long' }) ?? null,
            date: startDateTime?.toLocaleString({ day: 'numeric', month: 'long', year: 'numeric' }) ?? null,
            durationText: (() => {
                const calculatedDurationMinutes =
                    durationMinutes ||
                    (startDateTime && endDateTime ? endDateTime.diff(startDateTime, 'minutes').minutes : null)

                return calculatedDurationMinutes
                    ? calculatedDurationMinutes >= 60
                        ? `${Math.floor(calculatedDurationMinutes / 60)}h${
                              calculatedDurationMinutes % 60 ? ` ${calculatedDurationMinutes % 60}min` : ''
                          }`
                        : `${calculatedDurationMinutes}min`
                    : ''
            })(),
        }
    }, [dateStart, dateEnd, durationMinutes])
}
