import { Box, IconButton, TextField } from '@mui/material'
import MDEditor from '@uiw/react-md-editor'
import { DeleteRounded, DragIndicator } from '@mui/icons-material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    BuildingBlockImageValue,
    BuildingBlockItem,
    BuildingBlockItemType,
    BuildingBlockLinkValue,
    BuildingBlockVariant,
    Event,
} from '../../../types'
import { BlockImageItemEditor } from './BlockImageItemEditor'
import { isValidSlug, jsonItemError } from './blockUtils'
import { slugify } from '../../../utils/slugify'

export type BlockItemRowProps = {
    event: Event
    type: BuildingBlockItemType
    variant: BuildingBlockVariant
    item: BuildingBlockItem
    duplicateKey: boolean
    onChange: (item: BuildingBlockItem) => void
    onDelete: () => void
}
export const BlockItemRow = ({ event, type, variant, item, duplicateKey, onChange, onDelete }: BlockItemRowProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

    const style = {
        transform: transform ? CSS.Transform.toString({ ...transform, scaleX: 1, scaleY: 1 }) : '',
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    }

    const keyError = duplicateKey ? 'Duplicate key' : item.key && !isValidSlug(item.key) ? 'Must be a slug' : null
    const jsonError = type === 'json' ? jsonItemError(item.value) : null

    const editor = () => {
        switch (type) {
            case 'markdown':
                return (
                    <Box minHeight={50} flexGrow={1}>
                        <MDEditor
                            value={String(item.value)}
                            minHeight={10}
                            height="100%"
                            preview="edit"
                            onChange={(value) => onChange({ ...item, value: value || '' })}
                        />
                    </Box>
                )
            case 'image':
                return (
                    <BlockImageItemEditor
                        event={event}
                        value={item.value as BuildingBlockImageValue}
                        onChange={(value) => onChange({ ...item, value })}
                    />
                )
            case 'link': {
                const value = item.value as BuildingBlockLinkValue
                const update = (partial: Partial<BuildingBlockLinkValue>) =>
                    onChange({ ...item, value: { ...value, ...partial } })
                return (
                    <Box display="flex" gap={1} flexGrow={1} flexWrap="wrap">
                        <TextField
                            label="Label"
                            variant="standard"
                            value={value.label}
                            onChange={(e) => update({ label: e.target.value })}
                        />
                        <TextField
                            label="Href"
                            variant="standard"
                            sx={{ flexGrow: 1 }}
                            value={value.href}
                            onChange={(e) => update({ href: e.target.value })}
                        />
                        <TextField
                            label="Icon"
                            variant="standard"
                            value={value.icon || ''}
                            onChange={(e) => update({ icon: e.target.value || null })}
                        />
                        <TextField
                            label="Type"
                            variant="standard"
                            placeholder="primary, footer..."
                            value={value.type || ''}
                            onChange={(e) => update({ type: e.target.value || null })}
                        />
                    </Box>
                )
            }
            case 'json':
                return (
                    <TextField
                        label="JSON"
                        variant="outlined"
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={12}
                        value={String(item.value)}
                        error={!!jsonError}
                        helperText={jsonError}
                        InputProps={{ sx: { fontFamily: 'monospace', fontSize: 14 } }}
                        onChange={(e) => onChange({ ...item, value: e.target.value })}
                    />
                )
        }
    }

    return (
        <Box width="100%" mt={2} ref={setNodeRef} style={style}>
            <Box display="flex" alignItems="flex-start" gap={1}>
                {variant !== 'single' && (
                    <div {...attributes} {...listeners}>
                        <DragIndicator sx={{ cursor: 'grab', marginTop: 2 }} />
                    </div>
                )}
                {variant === 'map' && (
                    <TextField
                        required
                        label="Key"
                        variant="standard"
                        sx={{ width: 140 }}
                        value={item.key || ''}
                        error={!!keyError}
                        helperText={keyError}
                        onChange={(e) => onChange({ ...item, key: e.target.value })}
                        onBlur={(e) => onChange({ ...item, key: slugify(e.target.value) })}
                    />
                )}
                {editor()}
                <IconButton aria-label="Delete item" onClick={onDelete} edge="end">
                    <DeleteRounded />
                </IconButton>
            </Box>
        </Box>
    )
}
