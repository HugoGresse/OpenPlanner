import * as React from 'react'
import { Box, Typography } from '@mui/material'

type ScheduleHeaderProps = {
    eventName: string
    logoUrl?: string | null
    colorBackground?: string | null
}

export const ScheduleHeader = ({ eventName, logoUrl, colorBackground }: ScheduleHeaderProps) => {
    return (
        <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{
                backgroundColor: colorBackground || 'transparent',
                padding: 3,
                borderRadius: 1,
            }}>
            <Box display="flex" alignItems="center" gap={3}>
                {logoUrl && (
                    <Box
                        component="img"
                        src={logoUrl}
                        alt={`${eventName} logo`}
                        sx={{
                            height: 60,
                            width: 'auto',
                            objectFit: 'contain',
                        }}
                    />
                )}
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 'bold',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1, // Set line height to 1 to prevent descenders from affecting alignment
                        paddingTop: '0.2em', // Add slight padding to visually center text including descenders
                    }}>
                    {eventName}
                </Typography>
            </Box>
        </Box>
    )
}
