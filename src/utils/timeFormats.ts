import { DateTime } from 'luxon'

export const dateTimeToHourMinutes = (dateTime?: DateTime | null) => {
    if (!dateTime) {
        return null
    }
    return dateTime.toLocaleString(DateTime.TIME_24_SIMPLE)
}
