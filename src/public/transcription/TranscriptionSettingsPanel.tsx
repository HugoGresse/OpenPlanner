import { Box, Button, MenuItem, Stack, TextField } from '@mui/material'
import type { LiveV2TranscriptionLanguageCode } from '@gladiaio/sdk'
import { ColorPickerField } from './ColorPickerField'
import { FONT_OPTIONS, TranscriptionSettings } from './transcriptionSettings'

export type TranscriptionSettingsPanelProps = {
    settings: TranscriptionSettings
    onChange: (settings: TranscriptionSettings) => void
}

const ALIGNMENTS: TranscriptionSettings['alignment'][] = ['left', 'center', 'right']

// Floating settings panel (parity with the old gladia.html form). Changes apply live; session-shaping
// fields (languages, vocabulary, endpointing) restart the Gladia session via the hook's deps.
export const TranscriptionSettingsPanel = ({ settings, onChange }: TranscriptionSettingsPanelProps) => {
    const set = <K extends keyof TranscriptionSettings>(key: K, value: TranscriptionSettings[K]) =>
        onChange({ ...settings, [key]: value })

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 10,
                right: 10,
                zIndex: 1000,
                width: 280,
                p: 2,
                borderRadius: 1,
                background: 'rgba(0,0,0,0.75)',
                color: 'white',
            }}>
            <Stack spacing={1.5}>
                <TextField
                    size="small"
                    type="number"
                    label="Font size"
                    value={settings.fontSize}
                    onChange={(e) => set('fontSize', Number(e.target.value) || settings.fontSize)}
                />
                <TextField
                    size="small"
                    type="number"
                    label="Line height"
                    inputProps={{ step: 0.1, min: 0.5, max: 3 }}
                    value={settings.lineHeight}
                    onChange={(e) => set('lineHeight', Number(e.target.value) || settings.lineHeight)}
                />
                <TextField
                    size="small"
                    select
                    label="Font"
                    value={settings.fontName}
                    onChange={(e) => set('fontName', e.target.value)}>
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
                />
                <TextField
                    size="small"
                    select
                    label="Alignment"
                    value={settings.alignment}
                    onChange={(e) => set('alignment', e.target.value as TranscriptionSettings['alignment'])}>
                    {ALIGNMENTS.map((value) => (
                        <MenuItem key={value} value={value}>
                            {value}
                        </MenuItem>
                    ))}
                </TextField>
                <ColorPickerField
                    label="Background color"
                    value={settings.backgroundColor}
                    onChange={(hex) => set('backgroundColor', hex)}
                />
                <ColorPickerField
                    label="Text color"
                    value={settings.textColor}
                    onChange={(hex) => set('textColor', hex)}
                />
                <TextField
                    size="small"
                    label="Languages (comma)"
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
                />
                <TextField
                    size="small"
                    label="Custom vocabulary (comma)"
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
                />
                <TextField
                    size="small"
                    type="number"
                    label="Endpointing (s)"
                    inputProps={{ step: 0.05, min: 0 }}
                    value={settings.endpointing}
                    onChange={(e) => set('endpointing', Number(e.target.value) || settings.endpointing)}
                />
                <Button variant="contained" size="small" onClick={() => set('hideSettings', true)}>
                    Hide settings
                </Button>
            </Stack>
        </Box>
    )
}
