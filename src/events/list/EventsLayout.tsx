import * as React from 'react'
import { Box, Container, Typography } from '@mui/material'
import { EventLayoutAuthUser } from './EventLayoutAuthUser'

export type EventsLayoutProps = {
    children: React.ReactNode
}
export const EventsLayout = ({ children }: EventsLayoutProps) => {
    return (
        <Container component="main" maxWidth="md">
            <EventLayoutAuthUser />

            <Typography variant="h1">OpenPlanner</Typography>
            <Typography variant="h2">Your events</Typography>
            <Box marginTop={4} width="100%"></Box>

            {children}
        </Container>
    )
}
