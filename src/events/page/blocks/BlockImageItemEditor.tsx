import { useState } from 'react'
import { Box, Button, TextField, Tooltip } from '@mui/material'
import { FileUploadRounded, SwapHorizRounded } from '@mui/icons-material'
import { Event, BuildingBlockImageValue } from '../../../types'
import { SidePanelImageUploadControlled } from '../../../components/sidepanel/SidePanelImageUploadControlled'

// Checkerboard behind the preview so transparent images stay visible
const previewBackground =
    'linear-gradient(45deg, #8884 25%, transparent 25%), linear-gradient(-45deg, #8884 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #8884 75%), linear-gradient(-45deg, transparent 75%, #8884 75%)'

export type BlockImageItemEditorProps = {
    event: Event
    value: BuildingBlockImageValue
    onChange: (value: BuildingBlockImageValue) => void
}
export const BlockImageItemEditor = ({ event, value, onChange }: BlockImageItemEditorProps) => {
    const [uploadOpen, setUploadOpen] = useState(false)
    const hasImage = !!value.url

    return (
        <Box display="flex" gap={2} flexGrow={1} alignItems="flex-end">
            {hasImage && (
                <Tooltip title="Open the image panel">
                    <Box
                        onClick={() => setUploadOpen(true)}
                        sx={{
                            height: 56,
                            width: 90,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            background: previewBackground,
                            backgroundSize: '12px 12px',
                            backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                        }}>
                        <Box
                            component="img"
                            src={value.url}
                            alt={value.alt || ''}
                            sx={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                        />
                    </Box>
                </Tooltip>
            )}
            <Button
                variant={hasImage ? 'outlined' : 'contained'}
                color="secondary"
                startIcon={hasImage ? <SwapHorizRounded /> : <FileUploadRounded />}
                onClick={() => setUploadOpen(true)}
                sx={{ flexShrink: 0 }}>
                {hasImage ? 'Replace' : 'Add image'}
            </Button>
            <TextField
                label="Image URL"
                variant="standard"
                fullWidth
                value={value.url}
                onChange={(e) => onChange({ ...value, url: e.target.value })}
            />
            <TextField
                label="Alt text"
                variant="standard"
                sx={{ width: '40%' }}
                value={value.alt || ''}
                onChange={(e) => onChange({ ...value, alt: e.target.value || null })}
            />
            <SidePanelImageUploadControlled
                event={event}
                isOpen={uploadOpen}
                onClose={() => setUploadOpen(false)}
                title="Upload block image"
                value={value.url}
                onChange={(url) => onChange({ ...value, url })}
                maxImageSize={1500}
            />
        </Box>
    )
}
