import { Box, Card, Typography } from '@mui/material'
import { Event } from '../../../../types'
import { useOpenPlannerApi } from '../../../../services/hooks/useOpenPlannerApi'
import { formatBytes } from '../../../../utils/formatBytes'

type UsageResponse = {
    storage: { totalBytes: number; fileCount: number; topFiles: { name: string; sizeBytes: number }[] }
    network: { available: boolean; days: { date: string; bytes: number; requests: number }[]; totalBytes: number }
}

export const EventUsageCard = ({ event }: { event: Event }) => {
    const { data, isLoading, error } = useOpenPlannerApi<UsageResponse>(event, 'usage')

    return (
        <Card sx={{ paddingX: 2, paddingBottom: 2, mt: 4 }}>
            <Typography variant="h6" marginY={1}>
                Storage & network usage
            </Typography>
            {isLoading && <Typography color="text.secondary">Loading usage...</Typography>}
            {error && <Typography color="error">Failed to load usage: {error}</Typography>}
            {data && (
                <>
                    <Typography variant="body1">
                        <strong>{formatBytes(data.storage.totalBytes)}</strong> stored in {data.storage.fileCount} files
                        (images, exported JSON, PDF...)
                    </Typography>
                    {data.storage.topFiles.length > 0 && (
                        <Box component="ul" sx={{ margin: 0, color: 'text.secondary' }}>
                            {data.storage.topFiles.slice(0, 5).map((file) => (
                                <li key={file.name}>
                                    {file.name} — {formatBytes(file.sizeBytes)}
                                </li>
                            ))}
                        </Box>
                    )}
                    <Typography variant="body1" marginTop={2}>
                        {data.network.available ? (
                            <>
                                <strong>{formatBytes(data.network.totalBytes)}</strong> served over the last 7 days
                                (bandwidth billed by Google)
                            </>
                        ) : (
                            'Network usage not available yet: usage logs are collected from the day logging was enabled.'
                        )}
                    </Typography>
                    {data.network.available &&
                        data.network.days.map((day) => (
                            <Typography key={day.date} variant="body2" color="text.secondary">
                                {day.date}: {formatBytes(day.bytes)} • {day.requests} requests
                            </Typography>
                        ))}
                </>
            )}
        </Card>
    )
}
