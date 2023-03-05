import { StartEndTime } from './diffDays'
import { DateTime } from 'luxon'

export const generateTimeSlots = (start: DateTime, end: DateTime): StartEndTime[] => {
    const stepsMinutes = 5

    const diffMinutes = end.diff(start, ['minutes']).toObject().minutes || stepsMinutes

    const slotCount = Array.from(Array(diffMinutes / stepsMinutes).keys())

    return slotCount.map((_, index) => {
        if (index === 0) {
            return {
                start: start,
                end: start.plus({
                    minutes: stepsMinutes,
                }),
            }
        }

        return {
            start: start.plus({
                minutes: index * stepsMinutes,
            }),
            end: start.plus({
                minutes: index * stepsMinutes + 1,
            }),
        }
    })
}
