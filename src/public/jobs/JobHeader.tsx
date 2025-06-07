import { Box, Typography } from '@mui/material'
import { JsonEvent } from '../../../functions/src/api/routes/deploy/updateWebsiteActions/jsonTypes'

export const JobHeader = ({ event }: { event: JsonEvent | null | undefined }) => {
    if (!event) {
        return null
    }

    return (
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            {event.logoUrl && (
                <Box
                    component="img"
                    src={event.logoUrl}
                    alt={`${event.name} logo`}
                    sx={{ height: 60, width: 'auto', objectFit: 'contain' }}
                />
            )}
            <Typography variant="h4" component="h1">
                {event.name}
            </Typography>
        </Box>
    )
}
