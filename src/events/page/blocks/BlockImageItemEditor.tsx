import { useState } from 'react'
import { Box, Button, InputAdornment, TextField } from '@mui/material'
import { FileUploadRounded } from '@mui/icons-material'
import { Event, BuildingBlockImageValue } from '../../../types'
import { SidePanelImageUploadControlled } from '../../../components/sidepanel/SidePanelImageUploadControlled'

export type BlockImageItemEditorProps = {
    event: Event
    value: BuildingBlockImageValue
    onChange: (value: BuildingBlockImageValue) => void
}
export const BlockImageItemEditor = ({ event, value, onChange }: BlockImageItemEditorProps) => {
    const [uploadOpen, setUploadOpen] = useState(false)

    return (
        <Box display="flex" gap={2} flexGrow={1} alignItems="center">
            <Button
                variant="contained"
                color="secondary"
                startIcon={<FileUploadRounded />}
                onClick={() => setUploadOpen(true)}
                sx={{ flexShrink: 0 }}>
                Image
            </Button>
            <TextField
                label="Image URL"
                variant="standard"
                fullWidth
                value={value.url}
                onChange={(e) => onChange({ ...value, url: e.target.value })}
                InputProps={{
                    endAdornment: value.url ? (
                        <InputAdornment position="end">
                            <Box
                                component="img"
                                src={value.url}
                                alt=""
                                sx={{ maxHeight: 30, maxWidth: 60, cursor: 'pointer' }}
                                onClick={() => setUploadOpen(true)}
                            />
                        </InputAdornment>
                    ) : undefined,
                }}
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
