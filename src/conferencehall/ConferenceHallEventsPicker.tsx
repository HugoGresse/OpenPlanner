import * as React from 'react'
import { useConferenceHallEvents } from './hooks/useConferenceHallEvents'
import { FirestoreQueryLoaderAndErrorDisplay } from '../components/FirestoreQueryLoaderAndErrorDisplay'
import { useConferenceHallOrganization } from './hooks/useConferenceHallOrganization'
import { ConferenceHallEventItem } from './components/ConferenceHallEventItem'
import { ConferenceHallEvent, ConferenceHallOrganization } from '../types'
import { Box } from '@mui/material'
import { ConferenceHallOrganizationWithEventsItem } from './components/ConferenceHallOrganizationWithEventsItem'

export type ConferenceHallEventsPickerProps = {
    onEventPicked: (event: ConferenceHallEvent) => void
    userId: string
}
export const ConferenceHallEventsPicker = ({ userId, onEventPicked }: ConferenceHallEventsPickerProps) => {
    const userEvents = useConferenceHallEvents(userId)
    const organizations = useConferenceHallOrganization(userId)

    return (
        <div>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={userEvents} />

            <Box component="ul" display="flex" flexWrap="wrap" padding={0}>
                {(userEvents.data || [])
                    .filter((event: ConferenceHallEvent) => !event.organization)
                    .map((event: ConferenceHallEvent) => (
                        <ConferenceHallEventItem key={event.id} event={event} onClick={onEventPicked} />
                    ))}
            </Box>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={organizations} />
            <Box component="ul" display="flex" flexWrap="wrap" padding={0}>
                {(organizations.data || []).map((organization: ConferenceHallOrganization) => (
                    <ConferenceHallOrganizationWithEventsItem
                        key={organization.id}
                        organization={organization}
                        onClick={onEventPicked}
                    />
                ))}
            </Box>
        </div>
    )
}
