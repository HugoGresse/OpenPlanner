import { Box, Button, MenuItem, TextField } from '@mui/material'
import type { LiveV2TranscriptionLanguageCode } from '@gladiaio/sdk'
import { ColorPickerField } from './ColorPickerField'
import { FONT_OPTIONS, TranscriptionSettings } from './transcriptionSettings'

export type TranscriptionSettingsPanelProps = {
    settings: TranscriptionSettings
    onChange: (settings: TranscriptionSettings) => void
}

const ALIGNMENTS: TranscriptionSettings['alignment'][] = ['left', 'center', 'right']

// Horizontal settings strip above the bottom control bar. Changes apply live; session-shaping fields
// (languages, vocabulary, endpointing) restart the Gladia session via the hook's deps.
export const TranscriptionSettingsPanel = ({ settings, onChange }: TranscriptionSettingsPanelProps) => {
    const set = <K extends keyof TranscriptionSettings>(key: K, value: TranscriptionSettings[K]) =>
        onChange({ ...settings, [key]: value })

    const fieldSx = { width: { xs: 'calc(50% - 4px)', sm: 110 } }

    return (
        <Box
            sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                bgcolor: 'rgba(0,0,0,0.82)',
                color: '#fff',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(4px)',
            }}>
            <TextField
                size="small"
                type="number"
                label="Font size"
                value={settings.fontSize}
                onChange={(e) => set('fontSize', Number(e.target.value) || settings.fontSize)}
                sx={fieldSx}
            />
            <TextField
                size="small"
                type="number"
                label="Line height"
                inputProps={{ step: 0.1, min: 0.5, max: 3 }}
                value={settings.lineHeight}
                onChange={(e) => set('lineHeight', Number(e.target.value) || settings.lineHeight)}
                sx={fieldSx}
            />
            <TextField
                size="small"
                select
                label="Font"
                value={settings.fontName}
                onChange={(e) => set('fontName', e.target.value)}
                sx={{ width: { xs: '100%', sm: 150 } }}>
                {FONT_OPTIONS.map((font) => (
                    <MenuItem key={font} value={font}>
                        {font}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                size="small"
                type="number"
                label="Max lines"
                inputProps={{ min: 1, max: 10 }}
                value={settings.maxLines}
                onChange={(e) => set('maxLines', Number(e.target.value) || settings.maxLines)}
                sx={fieldSx}
            />
            <TextField
                size="small"
                select
                label="Alignment"
                value={settings.alignment}
                onChange={(e) => set('alignment', e.target.value as TranscriptionSettings['alignment'])}
                sx={fieldSx}>
                {ALIGNMENTS.map((value) => (
                    <MenuItem key={value} value={value}>
                        {value}
                    </MenuItem>
                ))}
            </TextField>
            <ColorPickerField
                label="Background"
                value={settings.backgroundColor}
                onChange={(hex) => set('backgroundColor', hex)}
            />
            <ColorPickerField label="Text" value={settings.textColor} onChange={(hex) => set('textColor', hex)} />
            <TextField
                size="small"
                label="Languages"
                value={settings.languages.join(',')}
                onChange={(e) =>
                    set(
                        'languages',
                        e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean) as LiveV2TranscriptionLanguageCode[]
                    )
                }
                sx={{ flex: 1, minWidth: { xs: '100%', sm: 140 } }}
            />
            <TextField
                size="small"
                label="Vocabulary"
                value={settings.customVocabulary.join(',')}
                onChange={(e) =>
                    set(
                        'customVocabulary',
                        e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                    )
                }
                sx={{ flex: 1, minWidth: { xs: '100%', sm: 140 } }}
            />
            <TextField
                size="small"
                type="number"
                label="Endpointing (s)"
                inputProps={{ step: 0.05, min: 0 }}
                value={settings.endpointing}
                onChange={(e) => {
                    const parsed = Number(e.target.value)
                    // Keep 0 (valid = disable endpointing); only fall back on empty/invalid input.
                    set(
                        'endpointing',
                        e.target.value === '' || Number.isNaN(parsed) || parsed < 0 ? settings.endpointing : parsed
                    )
                }}
                sx={fieldSx}
            />
            <Button variant="contained" size="small" onClick={() => set('hideSettings', true)} sx={{ ml: 'auto' }}>
                Hide settings
            </Button>
        </Box>
    )
}
