import * as React from 'react'
import { Box, Typography } from '@mui/material'

type ScheduleHeaderProps = {
    eventName: string
    logoUrl?: string | null
    color?: string | null
    colorBackground?: string | null
}

export const ScheduleHeader = ({ eventName, logoUrl, color, colorBackground }: ScheduleHeaderProps) => {
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
                    }}>
                    {eventName}
                </Typography>
            </Box>
        </Box>
    )
}
