import * as React from 'react'
import { Box, Typography } from '@mui/material'

export type RequireConferenceHallLoginProps = {
    children: (userId: string) => React.ReactNode
}
export const RequireConferenceHallLogin = (props: RequireConferenceHallLoginProps) => {
    return (
        <Box display="flex" gap={2} flexWrap="wrap" bgcolor="#FF3333" padding={2} borderRadius={2}>
            <Typography fontWeight="600">
                ⚠️ Conference Hall integration is disabled (major revamp needed for Conference Hall v2). You can track
                the status <a href="https://github.com/HugoGresse/OpenPlanner/issues/133">here</a>.
            </Typography>
        </Box>
    )
}
