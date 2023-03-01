import * as React from 'react'
import { ConferenceHallEvent, ConferenceHallOrganization } from '../../types'
import { Box, Typography } from '@mui/material'
import { useConferenceHallOrganizationEvents } from '../hooks/useConferenceHallOrganizationEvents'
import { ConferenceHallEventItem } from './ConferenceHallEventItem'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'

export type ConferenceHallOrganizationWithEventsItemProps = {
    organization: ConferenceHallOrganization
    onClick: (event: ConferenceHallEvent) => void
}
export const ConferenceHallOrganizationWithEventsItem = ({
    organization,
    onClick,
}: ConferenceHallOrganizationWithEventsItemProps) => {
    const events = useConferenceHallOrganizationEvents(organization.id)

    return (
        <Box component="li" marginRight={1} marginBottom={1} width="100%" sx={{ listStyle: 'none' }}>
            <Typography variant="h6"> {organization.name} </Typography>

            <FirestoreQueryLoaderAndErrorDisplay hookResult={events} />

            <Box component="ul" display="flex" flexWrap="wrap" padding={0}>
                {(events.data || []).map((event: ConferenceHallEvent) => (
                    <ConferenceHallEventItem key={`${organization.id}-${event.id}`} event={event} onClick={onClick} />
                ))}
            </Box>
        </Box>
    )
}
