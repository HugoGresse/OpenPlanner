import * as React from 'react'
import { ConferenceHallEvent } from '../../types'
import { Box, Button } from '@mui/material'

export type ConferenceHallEventItemProps = {
    event: ConferenceHallEvent
    onClick: (event: ConferenceHallEvent) => void
}
export const ConferenceHallEventItem = ({ event, onClick }: ConferenceHallEventItemProps) => {
    return (
        <Box component="li" marginRight={1} marginBottom={1} sx={{ listStyle: 'none' }}>
            <Button variant="contained" size="large" onClick={() => onClick(event)}>
                {event.name}
            </Button>
        </Box>
    )
}
