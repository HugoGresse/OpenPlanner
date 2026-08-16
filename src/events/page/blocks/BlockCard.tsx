import { useEffect, useMemo, useRef, useState } from 'react'
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    DialogContentText,
    IconButton,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { DeleteRounded, DragIndicator, ExpandLessSharp, ExpandMore } from '@mui/icons-material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { doc } from 'firebase/firestore'
import { BuildingBlock, Event } from '../../../types'
import { collections } from '../../../services/firebase'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { BlockItemsEditor } from './BlockItemsEditor'
import { BlockDraft, blockExportPath, createBlockItem, slugifyBlockKey, validateBlockDraft } from './blockUtils'

const draftOf = (block: BuildingBlock): BlockDraft => ({
    name: block.name,
    key: block.key,
    group: block.group || null,
    items: block.items,
})

export type BlockCardProps = {
    event: Event
    block: BuildingBlock
    allBlocks: BuildingBlock[]
}
export const BlockCard = ({ event, block, allBlocks }: BlockCardProps) => {
    const [isOpen, setOpen] = useState(false)
    const [isDeleting, setDeleting] = useState(false)
    const [draft, setDraft] = useState<BlockDraft>(draftOf(block))
    const [didChange, setDidChange] = useState(false)
    // Ref mirror so the re-seed effect can check dirtiness without re-running on every edit
    const didChangeRef = useRef(false)
    const mutation = useFirestoreDocumentMutation(doc(collections.buildingBlocks(event.id), block.id))
    const deletion = useFirestoreDocumentDeletion(doc(collections.buildingBlocks(event.id), block.id))

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
    const style = {
        transform: transform ? CSS.Transform.toString({ ...transform, scaleX: 1, scaleY: 1 }) : '',
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    }

    const setDirty = (changed: boolean) => {
        didChangeRef.current = changed
        setDidChange(changed)
    }

    useEffect(() => {
        // The subscribed snapshot rebuilds every block object on any collection write
        // (enabled toggle, segment reorder...). Only re-seed when there are no local
        // edits, otherwise in-progress changes would be wiped without saving.
        if (!didChangeRef.current) {
            setDraft(draftOf(block))
            setDidChange(false)
        }
    }, [block])

    const updateDraft = (newDraft: BlockDraft) => {
        setDraft(newDraft)
        setDirty(JSON.stringify(newDraft) !== JSON.stringify(draftOf(block)))
    }

    // Slugification happens at validate/save time, not on blur: an Autocomplete blur
    // can fire in the same turn as its input change and would read a stale draft
    const normalizedDraft = useMemo(
        () => ({ ...draft, key: slugifyBlockKey(draft.key), group: draft.group ? slugifyBlockKey(draft.group) : null }),
        [draft]
    )

    const errors = useMemo(
        () =>
            didChange
                ? validateBlockDraft({ page: block.page, type: block.type, ...normalizedDraft }, allBlocks, block.id)
                : [],
        [didChange, normalizedDraft, allBlocks, block]
    )

    const groupOptions = useMemo(
        () => [...new Set(allBlocks.filter((b) => b.page === block.page && b.group).map((b) => b.group as string))],
        [allBlocks, block.page]
    )

    const save = async () => {
        setDraft(normalizedDraft)
        await mutation.mutate(normalizedDraft)
        setDirty(false)
    }

    return (
        <Box width="100%" ref={setNodeRef} style={style} mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
                <div {...attributes} {...listeners}>
                    <DragIndicator sx={{ cursor: 'grab' }} />
                </div>
                <Typography variant="h6">{draft.name || draft.key}</Typography>
                <Chip label={block.type} size="small" />
                <Chip label={block.variant} size="small" variant="outlined" />
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', flexGrow: 1 }}>
                    {blockExportPath(block.page, draft.group, draft.key)}
                </Typography>
                <Tooltip title={block.enabled ? 'Included in the exported JSON' : 'Excluded from the exported JSON'}>
                    <Switch checked={block.enabled} onChange={(e) => mutation.mutate({ enabled: e.target.checked })} />
                </Tooltip>
                <IconButton aria-label="Delete block" onClick={() => setDeleting(true)}>
                    <DeleteRounded />
                </IconButton>
                <IconButton onClick={() => setOpen(!isOpen)}>
                    {isOpen ? <ExpandLessSharp /> : <ExpandMore />}
                </IconButton>
                {didChange && (
                    <LoadingButton
                        variant="contained"
                        onClick={save}
                        loading={mutation.isLoading}
                        disabled={errors.length > 0}>
                        Save
                    </LoadingButton>
                )}
            </Box>
            {isOpen && (
                <Box paddingLeft={4}>
                    <Box display="flex" gap={2} flexWrap="wrap" mt={1}>
                        <TextField
                            label="Name"
                            variant="standard"
                            value={draft.name}
                            onChange={(e) => updateDraft({ ...draft, name: e.target.value })}
                        />
                        <TextField
                            label="Key"
                            variant="standard"
                            required
                            value={draft.key}
                            onChange={(e) => updateDraft({ ...draft, key: e.target.value })}
                            onBlur={(e) => updateDraft({ ...draft, key: slugifyBlockKey(e.target.value) })}
                        />
                        <Autocomplete
                            freeSolo
                            options={groupOptions}
                            value={draft.group || ''}
                            onInputChange={(_, value) => updateDraft({ ...draft, group: value || null })}
                            sx={{ minWidth: 200 }}
                            renderInput={(params) => (
                                <TextField {...params} label="Group (optional)" variant="standard" />
                            )}
                        />
                    </Box>
                    <BlockItemsEditor
                        event={event}
                        type={block.type}
                        variant={block.variant}
                        items={draft.items}
                        onChange={(items) => updateDraft({ ...draft, items })}
                    />
                    {(block.variant !== 'single' || draft.items.length === 0) && (
                        <Button
                            variant="contained"
                            color="secondary"
                            sx={{ mt: 2 }}
                            onClick={() =>
                                updateDraft({
                                    ...draft,
                                    items: [
                                        ...draft.items,
                                        createBlockItem(block.type, block.variant, draft.items.length),
                                    ],
                                })
                            }>
                            Add item
                        </Button>
                    )}
                    {errors.map((error) => (
                        <Typography key={error} color="error" variant="body2" mt={1}>
                            {error}
                        </Typography>
                    ))}
                </Box>
            )}
            <ConfirmDialog
                open={isDeleting}
                title="Delete this block?"
                acceptButton={`Delete ${draft.name || draft.key}`}
                disabled={deletion.isLoading}
                loading={deletion.isLoading}
                cancelButton="cancel"
                handleClose={() => setDeleting(false)}
                handleAccept={async () => {
                    await deletion.mutate()
                    setDeleting(false)
                }}>
                <DialogContentText>
                    Delete the block "{draft.name || draft.key}" ({blockExportPath(block.page, block.group, block.key)}
                    )?
                </DialogContentText>
            </ConfirmDialog>
        </Box>
    )
}
