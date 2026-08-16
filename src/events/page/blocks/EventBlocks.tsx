import { useState } from 'react'
import { Box, Button, Card, Container, Typography } from '@mui/material'
import { Event } from '../../../types'
import { useBuildingBlocks } from '../../../services/hooks/useBuildingBlocks'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { BlockPageCard } from './BlockPageCard'
import { NewBlockDialog } from './NewBlockDialog'
import { groupBlocksByPage } from './blockUtils'

export const EventBlocks = ({ event }: { event: Event }) => {
    const queryResult = useBuildingBlocks(event)
    const [addDialog, setAddDialog] = useState<{ open: boolean; page?: string }>({ open: false })

    if (queryResult.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={queryResult} />
    }

    const blocks = queryResult.data || []
    const pages = groupBlocksByPage(blocks)

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Card sx={{ padding: 2, marginY: 2 }}>
                <Typography variant="body1" gutterBottom>
                    Building blocks let you describe any custom content for your event website: texts, images, links, or
                    raw JSON. They are shipped in the exported JSON (after an "Update website") under{' '}
                    <code>blocks.&lt;page&gt;.&lt;key&gt;</code> (or{' '}
                    <code>blocks.&lt;page&gt;.&lt;group&gt;.&lt;key&gt;</code>
                    ), so your website can render them however you like.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Single = one value, list = ordered array, map = keyed object. Disabled blocks are excluded from the
                    export.
                </Typography>
            </Card>

            {pages.map(([page, pageBlocks]) => (
                <BlockPageCard
                    key={page}
                    event={event}
                    page={page}
                    blocks={pageBlocks}
                    allBlocks={blocks}
                    onAddBlock={(targetPage) => setAddDialog({ open: true, page: targetPage })}
                />
            ))}

            <Box marginY={2}>
                <Button variant={pages.length ? 'text' : 'contained'} onClick={() => setAddDialog({ open: true })}>
                    Add building block
                </Button>
            </Box>

            <NewBlockDialog
                open={addDialog.open}
                onClose={() => setAddDialog({ open: false })}
                eventId={event.id}
                blocks={blocks}
                initialPage={addDialog.page}
            />
        </Container>
    )
}
