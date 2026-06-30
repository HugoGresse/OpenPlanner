import { useState } from 'react'
import { Box, Popover, Stack, Typography } from '@mui/material'
import { HexColorInput, HexColorPicker } from 'react-colorful'
import { toCssColor, toHexColor } from './transcriptionSettings'

export type ColorPickerFieldProps = {
    label: string
    // Bare hex without a leading "#", matching how settings/URLs store colors.
    value: string
    onChange: (hex: string) => void
}

// A labelled colour swatch that opens a react-colorful picker (with a hex input) in a popover.
export const ColorPickerField = ({ label, value, onChange }: ColorPickerFieldProps) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    const css = toCssColor(value)

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <Box
                role="button"
                aria-label={label}
                onClick={(e) => setAnchor(e.currentTarget)}
                sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    cursor: 'pointer',
                    backgroundColor: css,
                    border: '1px solid rgba(255,255,255,0.4)',
                    flexShrink: 0,
                }}
            />
            <Typography sx={{ fontSize: 13, opacity: 0.85 }}>{label}</Typography>

            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
                <Stack spacing={1} sx={{ p: 1.5 }}>
                    <HexColorPicker color={css} onChange={(hex) => onChange(toHexColor(hex))} />
                    <HexColorInput
                        color={css}
                        onChange={(hex) => onChange(toHexColor(hex))}
                        prefixed
                        style={{ width: '100%', textAlign: 'center', textTransform: 'uppercase' }}
                    />
                </Stack>
            </Popover>
        </Stack>
    )
}
