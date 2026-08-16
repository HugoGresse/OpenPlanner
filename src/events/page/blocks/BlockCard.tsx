import { useState } from 'react'
import { Box, Chip, DialogContentText, IconButton, Switch, Tooltip, Typography } from '@mui/material'
import { ChevronRight, DeleteRounded, DragIndicator } from '@mui/icons-material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { doc } from 'firebase/firestore'
import { useLocation } from 'wouter'
import { BuildingBlock, Event } from '../../../types'
import { collections } from '../../../services/firebase'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { blockExportPath } from './blockUtils'

export type BlockCardProps = {
    event: Event
    block: BuildingBlock
}
export const BlockCard = ({ event, block }: BlockCardProps) => {
    const [_, setLocation] = useLocation()
    const [isDeleting, setDeleting] = useState(false)
    const mutation = useFirestoreDocumentMutation(doc(collections.buildingBlocks(event.id), block.id))
    const deletion = useFirestoreDocumentDeletion(doc(collections.buildingBlocks(event.id), block.id))

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
    const style = {
        transform: transform ? CSS.Transform.toString({ ...transform, scaleX: 1, scaleY: 1 }) : '',
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <Box width="100%" ref={setNodeRef} style={style} mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
                <div {...attributes} {...listeners}>
                    <DragIndicator sx={{ cursor: 'grab' }} />
                </div>
                <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexGrow={1}
                    sx={{ cursor: 'pointer', '&:hover h6': { textDecoration: 'underline' } }}
                    onClick={() => setLocation(`/blocks/${block.id}`)}>
                    <Typography variant="h6">
                        {block.name || block.key} ({block.items.length})
                    </Typography>
                    <Chip label={block.type} size="small" />
                    <Chip label={block.variant} size="small" variant="outlined" />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {blockExportPath(block.page, block.group, block.key)}
                    </Typography>
                </Box>
                <Tooltip title={block.enabled ? 'Included in the exported JSON' : 'Excluded from the exported JSON'}>
                    <Switch checked={block.enabled} onChange={(e) => mutation.mutate({ enabled: e.target.checked })} />
                </Tooltip>
                <IconButton aria-label="Delete block" onClick={() => setDeleting(true)}>
                    <DeleteRounded />
                </IconButton>
                <IconButton aria-label="Edit block" onClick={() => setLocation(`/blocks/${block.id}`)}>
                    <ChevronRight />
                </IconButton>
            </Box>
            <ConfirmDialog
                open={isDeleting}
                title="Delete this block?"
                acceptButton={`Delete ${block.name || block.key}`}
                disabled={deletion.isLoading}
                loading={deletion.isLoading}
                cancelButton="cancel"
                handleClose={() => setDeleting(false)}
                handleAccept={async () => {
                    await deletion.mutate()
                    setDeleting(false)
                }}>
                <DialogContentText>
                    Delete the block "{block.name || block.key}" ({blockExportPath(block.page, block.group, block.key)}
                    )?
                </DialogContentText>
            </ConfirmDialog>
        </Box>
    )
}
