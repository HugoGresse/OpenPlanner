import { Box, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { useAdminUsage } from '../../services/hooks/useAdminUsage'
import { formatBytes } from '../../utils/formatBytes'

// Global storage & bandwidth per event, for the super-admin screen.
// Event names are joined client-side from the events the screen already loads.
export const AdminUsageSection = ({ eventNames }: { eventNames: Map<string, string> }) => {
    const { data, error, isLoading } = useAdminUsage()

    if (isLoading) {
        return <Typography color="text.secondary">Loading usage analytics...</Typography>
    }
    if (error || !data) {
        return <Typography color="error">Usage analytics unavailable: {error}</Typography>
    }

    const rows = data.events.map((event) => ({
        id: event.eventId,
        name: eventNames.get(event.eventId) || event.eventId,
        storage: event.storageBytes,
        files: event.fileCount,
        network: event.networkBytes,
        requests: event.networkRequests,
    }))

    return (
        <Box marginY={4}>
            <Typography variant="h2">Usage analytics</Typography>
            <Typography variant="body1" marginY={1}>
                <strong>{formatBytes(data.totalStorageBytes)}</strong> stored in {data.totalFileCount} files.{' '}
                {data.networkAvailable ? (
                    <>
                        <strong>{formatBytes(data.totalNetworkBytes)}</strong> served over the last 7 days (this is the
                        bandwidth Google bills):
                        {data.networkDays.map((day) => (
                            <Typography
                                key={day.date}
                                component="span"
                                variant="body2"
                                display="block"
                                color="text.secondary">
                                {day.date}: {formatBytes(day.bytes)} • {day.requests} requests
                            </Typography>
                        ))}
                    </>
                ) : (
                    'Network usage unavailable (usage logs not readable).'
                )}
            </Typography>
            <DataGrid
                autoHeight
                density="compact"
                rows={rows}
                initialState={{ sorting: { sortModel: [{ field: 'network', sort: 'desc' }] } }}
                columns={[
                    { field: 'name', headerName: 'Event', width: 240 },
                    {
                        field: 'network',
                        headerName: 'Bandwidth 7d',
                        width: 140,
                        valueFormatter: (params: { value?: number }) => formatBytes(params.value || 0),
                    },
                    { field: 'requests', headerName: 'Requests 7d', width: 120 },
                    {
                        field: 'storage',
                        headerName: 'Storage',
                        width: 130,
                        valueFormatter: (params: { value?: number }) => formatBytes(params.value || 0),
                    },
                    { field: 'files', headerName: 'Files', width: 100 },
                ]}
            />
        </Box>
    )
}
