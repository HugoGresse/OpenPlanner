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

export type StartEndTime = {
    start: DateTime
    end: DateTime
}
export const getIndividualDays = (start: string | Date | null, end: string | Date | null): StartEndTime[] => {
    const numberOfDays = diffDays(start, end)

    if (numberOfDays === 0 || !start || !end) {
        return []
    }

    const startTime = start instanceof Date ? DateTime.fromJSDate(start) : DateTime.fromISO(start)
    const endTime = end instanceof Date ? DateTime.fromJSDate(end) : DateTime.fromISO(end)

    const days: StartEndTime[] = [
        {
            start: startTime,
            end: startTime.set({
                minute: endTime.minute,
                hour: endTime.hour,
            }),
        },
    ]

    if (numberOfDays > 1) {
        Array.from(Array(numberOfDays - 2).keys()).map((d) => {
            const date = startTime.plus({
                days: 1,
            })
            days.push({
                start: date,
                end: date.set({
                    minute: endTime.minute,
                    hour: endTime.hour,
                }),
            })
        })
        days.push({
            start: endTime.set({
                minute: startTime.minute,
                hour: startTime.hour,
            }),
            end: endTime,
        })
    }

    return days
}
