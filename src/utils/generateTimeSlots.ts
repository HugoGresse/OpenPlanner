import { StartEndTime } from './diffDays'
import { DateTime } from 'luxon'
import { ScheduleSlotDurationMinutes } from '../events/page/schedule/scheduleConstants'

export const generateTimeSlots = (start: DateTime, end: DateTime): StartEndTime[] => {
    const diffMinutes = end.diff(start, ['minutes']).toObject().minutes || ScheduleSlotDurationMinutes

    const slotCount = Array.from(Array(diffMinutes / ScheduleSlotDurationMinutes).keys())

    return slotCount.map((_, index) => {
        if (index === 0) {
            return {
                start: start,
                end: start.plus({
                    minutes: ScheduleSlotDurationMinutes,
                }),
            }
        }

        return {
            start: start.plus({
                minutes: index * ScheduleSlotDurationMinutes,
            }),
            end: start.plus({
                minutes: index * ScheduleSlotDurationMinutes + 1,
            }),
        }
    })
}
