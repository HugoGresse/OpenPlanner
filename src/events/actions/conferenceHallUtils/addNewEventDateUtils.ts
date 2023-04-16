import { ConferenceHallEvent } from '../../../types'
import { DateTime } from 'luxon'

export const getNewEventDates = (chEvent: ConferenceHallEvent): { start: Date | null; end: Date | null } => {
    const start = chEvent.conferenceDates?.start?.toDate() || null
    const end = chEvent.conferenceDates?.end?.toDate() || null

    if (!start) {
        return {
            start: null,
            end: null,
        }
    }

    const startDateTime: DateTime = DateTime.fromJSDate(start)

    const finalStartTime = startDateTime.set({
        minute: 0,
        hour: 8,
    })

    if (!end) {
        return {
            start: finalStartTime.toJSDate(),
            end: startDateTime
                .set({
                    minute: 0,
                    hour: 22,
                })
                .toJSDate(),
        }
    }

    const endDateTime: DateTime = DateTime.fromJSDate(end)

    return {
        start: finalStartTime.toJSDate(),
        end: endDateTime
            .set({
                minute: 0,
                hour: 22,
            })
            .toJSDate(),
    }
}
