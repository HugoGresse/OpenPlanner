import { useEffect, useMemo, useRef, useState } from 'react'
import {
    Autocomplete,
    Box,
    Button,
    Card,
    Chip,
    Container,
    DialogContentText,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { ArrowBack, DeleteRounded } from '@mui/icons-material'
import { useLocation, useRoute } from 'wouter'
import { doc } from 'firebase/firestore'
import { BuildingBlock, Event } from '../../../types'
import { collections } from '../../../services/firebase'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { useBuildingBlocks } from '../../../services/hooks/useBuildingBlocks'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { BlockItemsEditor } from './BlockItemsEditor'
import { BlockDraft, blockExportPath, createBlockItem, slugifyBlockKey, validateBlockDraft } from './blockUtils'

const draftOf = (block: BuildingBlock): BlockDraft => ({
    name: block.name,
    key: block.key,
    group: block.group || null,
    items: block.items,
})

const BlockEditor = ({
    event,
    block,
    allBlocks,
}: {
    event: Event
    block: BuildingBlock
    allBlocks: BuildingBlock[]
}) => {
    const [_, setLocation] = useLocation()
    const [isDeleting, setDeleting] = useState(false)
    const [draft, setDraft] = useState<BlockDraft>(draftOf(block))
    const [didChange, setDidChange] = useState(false)
    // Ref mirror so the re-seed effect can check dirtiness without re-running on every edit
    const didChangeRef = useRef(false)
    const mutation = useFirestoreDocumentMutation(doc(collections.buildingBlocks(event.id), block.id))
    const deletion = useFirestoreDocumentDeletion(doc(collections.buildingBlocks(event.id), block.id))

    const setDirty = (changed: boolean) => {
        didChangeRef.current = changed
        setDidChange(changed)
    }

    useEffect(() => {
        // The subscribed snapshot rebuilds every block object on any collection write.
        // Only re-seed when there are no local edits, otherwise in-progress changes
        // would be wiped without saving.
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
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" alignItems="center" gap={1}>
                <Button startIcon={<ArrowBack />} onClick={() => setLocation('/blocks')}>
                    All blocks
                </Button>
                <Box flexGrow={1} />
                <Tooltip title={block.enabled ? 'Included in the exported JSON' : 'Excluded from the exported JSON'}>
                    <Switch checked={block.enabled} onChange={(e) => mutation.mutate({ enabled: e.target.checked })} />
                </Tooltip>
                <Button startIcon={<DeleteRounded />} color="error" onClick={() => setDeleting(true)}>
                    Delete
                </Button>
            </Box>

            <Card sx={{ padding: 2, marginY: 2 }}>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Typography variant="h4">{draft.name || draft.key}</Typography>
                    <Chip label={block.type} size="small" />
                    <Chip label={block.variant} size="small" variant="outlined" />
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {blockExportPath(block.page, draft.group, draft.key)}
                    </Typography>
                    <Box flexGrow={1} />
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

                <Box display="flex" gap={2} flexWrap="wrap" mt={2}>
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
                        onInputChange={(_event, value) => updateDraft({ ...draft, group: value || null })}
                        sx={{ minWidth: 200 }}
                        renderInput={(params) => <TextField {...params} label="Group (optional)" variant="standard" />}
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
                                items: [...draft.items, createBlockItem(block.type, block.variant, draft.items.length)],
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
            </Card>

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
                    setLocation('/blocks')
                }}>
                <DialogContentText>
                    Delete the block "{draft.name || draft.key}" ({blockExportPath(block.page, block.group, block.key)}
                    )?
                </DialogContentText>
            </ConfirmDialog>
        </Container>
    )
}

export const EventBlock = ({ event }: { event: Event }) => {
    const [_, params] = useRoute('/:routeName/:blockId/*?')
    const [_2, setLocation] = useLocation()
    const queryResult = useBuildingBlocks(event)

    const blockId = params?.blockId

    if (queryResult.isLoading || !queryResult.loaded) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={queryResult} />
    }

    const blocks = queryResult.data || []
    const block = blocks.find((b) => b.id === blockId)

    if (!blockId || !block) {
        setLocation('/blocks')
        return null
    }

    return <BlockEditor event={event} block={block} allBlocks={blocks} />
}
