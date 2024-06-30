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

                // Filter upcoming or ongoing sessions based on the date
                const dateEnd = DateTime.fromISO(s.dateEnd)

                const isPastSessionForMoreThanOneHour = dateEnd < DateTime.now().minus({ hours: 1 })

                if (isPastSessionForMoreThanOneHour) {
                    return false
                }

                // const isOngoingSession = dateStart < DateTime.now() && dateEnd > DateTime.now()
                return true
            })
            .sort((a, b) => {
                const dateStartA = DateTime.fromISO(a.dateStart)
                const dateStartB = DateTime.fromISO(b.dateStart)
                return dateStartA.diff(DateTime.now()).milliseconds - dateStartB.diff(DateTime.now()).milliseconds
            })

        setUpComingOnOngoingSessionsForThisTrack(eventForSelectedTrack)

        if (!selectedTalk) {
            setSelectedTalk(eventForSelectedTrack[0])
        }
    }, [selectedTrack, eventData])

    return [selectedTalk, upComingOnOngoingSessionsForThisTrack, reset, setSelectedTalk]
}
