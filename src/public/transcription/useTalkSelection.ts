import { DateTime } from 'luxon'
import { PublicJSON } from '../publicTypes'
import { useEffect, useState } from 'react'

export const useTalkSelection = (
    selectedTrack: string,
    eventData: PublicJSON | null
): [
    PublicJSON['sessions'][0] | null,
    PublicJSON['sessions'],
    () => void,
    (talk: PublicJSON['sessions'][0]) => void
] => {
    const [upComingOnOngoingSessionsForThisTrack, setUpComingOnOngoingSessionsForThisTrack] = useState<
        PublicJSON['sessions']
    >([])
    const [selectedTalk, setSelectedTalk] = useState<PublicJSON['sessions'][0] | null>(null)

    const reset = () => {
        setUpComingOnOngoingSessionsForThisTrack([])
        setSelectedTalk(null)
    }

    useEffect(() => {
        if (!eventData || !selectedTrack || selectedTrack.length === 0) {
            return
        }
        // const dateNow = DateTime.fromISO('2024-07-05T17:05:00.000+02:00')
        const dateNow = DateTime.now()
        const eventForSelectedTrack = eventData?.sessions
            .filter((s) => {
                const trackMatch = s.trackId === selectedTrack

                if (!trackMatch) {
                    return false
                }

                const showInFeedback = s.showInFeedback

                if (!showInFeedback) {
                    return false
                }

                const dateStart = DateTime.fromISO(s.dateStart)
                const dateEnd = DateTime.fromISO(s.dateEnd)

                const isPastDay = dateStart < dateNow.set({ hour: 0, minute: 0, second: 0, millisecond: 0 })

                if (isPastDay) {
                    return false
                }

                // Filter upcoming or ongoing sessions based on the date
                const isPastSessionForMoreThanOneHour = dateEnd < dateNow.minus({ hours: 1 })

                if (isPastSessionForMoreThanOneHour) {
                    return false
                }

                // const isOngoingSession = dateStart < dateNow && dateEnd > dateNow
                return true
            })
            .sort((a, b) => {
                const dateStartA = DateTime.fromISO(a.dateStart)
                const dateStartB = DateTime.fromISO(b.dateStart)
                return dateStartA.diff(dateNow).milliseconds - dateStartB.diff(dateNow).milliseconds
            })

        setUpComingOnOngoingSessionsForThisTrack(eventForSelectedTrack)

        if (!selectedTalk) {
            setSelectedTalk(eventForSelectedTrack[0])
        }
    }, [selectedTrack, eventData])

    return [selectedTalk, upComingOnOngoingSessionsForThisTrack, reset, setSelectedTalk]
}
