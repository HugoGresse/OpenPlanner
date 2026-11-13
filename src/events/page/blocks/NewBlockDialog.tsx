import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'wouter'
import { Autocomplete, Box, MenuItem, TextField, Typography } from '@mui/material'
import { useFirestoreCollectionMutation } from '../../../services/hooks/firestoreMutationHooks'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { collections } from '../../../services/firebase'
import { slugifyBlockKey } from './blockUtils'
import { BuildingBlock, BuildingBlockItemType, BuildingBlockVariant } from '../../../types'
import { validateBlockDraft } from './blockUtils'

const ITEM_TYPES: { value: BuildingBlockItemType; label: string }[] = [
    { value: 'markdown', label: 'Markdown text' },
    { value: 'image', label: 'Image' },
    { value: 'link', label: 'Link / button' },
    { value: 'json', label: 'Custom JSON' },
]
const VARIANTS: { value: BuildingBlockVariant; label: string }[] = [
    { value: 'single', label: 'Single element' },
    { value: 'list', label: 'Ordered list' },
    { value: 'map', label: 'Map (keyed elements)' },
]

export type NewBlockDialogProps = {
    open: boolean
    onClose: () => void
    eventId: string
    blocks: BuildingBlock[]
    initialPage?: string
}
export const NewBlockDialog = ({ open, onClose, eventId, blocks, initialPage }: NewBlockDialogProps) => {
    const [_, setLocation] = useLocation()
    const [page, setPage] = useState<string>(initialPage || 'home')
    const [group, setGroup] = useState<string>('')
    const [name, setName] = useState<string>('')
    const [key, setKey] = useState<string>('')
    const [keyEdited, setKeyEdited] = useState(false)
    const [type, setType] = useState<BuildingBlockItemType>('markdown')
    const [variant, setVariant] = useState<BuildingBlockVariant>('single')
    const mutation = useFirestoreCollectionMutation(collections.buildingBlocks(eventId))

    useEffect(() => {
        if (open) {
            setPage(initialPage || 'home')
            setGroup('')
            setName('')
            setKey('')
            setKeyEdited(false)
        }
    }, [open, initialPage])

    const pageOptions = useMemo(() => [...new Set(blocks.map((block) => block.page))], [blocks])
    const groupOptions = useMemo(
        () => [...new Set(blocks.filter((b) => b.page === page && b.group).map((b) => b.group as string))],
        [blocks, page]
    )

    const draft = {
        page: slugifyBlockKey(page || 'home'),
        group: group ? slugifyBlockKey(group) : null,
        key,
        type,
        items: [],
    }
    const errors = name.length || key.length ? validateBlockDraft(draft, blocks, null) : []

    return (
        <ConfirmDialog
            open={open}
            handleClose={onClose}
            fullWidth
            maxWidth="sm"
            loading={mutation.isLoading}
            disabled={!key.length || errors.length > 0}
            title="Add a building block"
            acceptButton="Add"
            cancelButton="cancel"
            handleAccept={() => {
                const segmentBlocks = blocks.filter((b) => b.page === draft.page && (b.group || null) === draft.group)
                return mutation
                    .mutate({
                        page: draft.page,
                        group: draft.group,
                        key: draft.key,
                        name: name || draft.key,
                        type,
                        variant,
                        enabled: true,
                        order: segmentBlocks.length,
                        items: [],
                    })
                    .then((newBlockId: string | undefined) => {
                        onClose()
                        if (newBlockId) {
                            setLocation(`/blocks/${newBlockId}`)
                        }
                    })
            }}>
            <Box marginY={1} display="flex" flexDirection="column" gap={2}>
                <Autocomplete
                    freeSolo
                    options={pageOptions}
                    inputValue={page}
                    onInputChange={(_, value) => setPage(value)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Page / section"
                            autoFocus
                            helperText="e.g. home, venue, tickets"
                        />
                    )}
                />
                <Autocomplete
                    freeSolo
                    options={groupOptions}
                    inputValue={group}
                    onInputChange={(_, value) => setGroup(value)}
                    renderInput={(params) => (
                        <TextField {...params} label="Group (optional)" helperText="Extra nesting level, e.g. footer" />
                    )}
                />
                <TextField
                    label="Name"
                    fullWidth
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value)
                        if (!keyEdited) {
                            setKey(slugifyBlockKey(e.target.value))
                        }
                    }}
                />
                <TextField
                    label="Key"
                    required
                    fullWidth
                    value={key}
                    helperText="Access path in the exported JSON, e.g. blocks.home.hero"
                    onChange={(e) => {
                        setKeyEdited(true)
                        setKey(e.target.value)
                    }}
                    onBlur={(e) => setKey(slugifyBlockKey(e.target.value))}
                />
                <TextField
                    select
                    label="Content type"
                    value={type}
                    onChange={(e) => setType(e.target.value as BuildingBlockItemType)}>
                    {ITEM_TYPES.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    label="Structure"
                    value={variant}
                    onChange={(e) => setVariant(e.target.value as BuildingBlockVariant)}>
                    {VARIANTS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

                {errors.map((error) => (
                    <Typography key={error} color="error" variant="body2">
                        {error}
                    </Typography>
                ))}
                {mutation.isError && (
                    <Typography color="error">Error while adding block: {mutation.error?.message}</Typography>
                )}
            </Box>
        </ConfirmDialog>
    )
}
