import * as React from 'react'
import { Box, InputAdornment, TextField, Typography } from '@mui/material'
import { Format } from '../../types'

export type ConferenceHallFormatsMappingProps = {
    formats: Format[]
    setFormatDurations: (f: Format[]) => void
}
export const ConferenceHallFormatsMapping = ({ formats, setFormatDurations }: ConferenceHallFormatsMappingProps) => {
    if (!formats.length) {
        return null
    }

    return (
        <Box display="flex" flexDirection="column">
            <Typography fontWeight="bold">Assign duration in minutes to proposals formats:</Typography>
            {formats.map((format) => (
                <Box key={format.id} display="flex">
                    <TextField
                        label={format.name}
                        value={format.durationMinutes}
                        onChange={(e) => {
                            setFormatDurations(
                                formats.map((f) => {
                                    if (f.id === format.id) {
                                        return {
                                            ...f,
                                            durationMinutes: parseInt(e.target.value),
                                        }
                                    }
                                    return f
                                })
                            )
                        }}
                        inputProps={{
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                        }}
                        InputProps={{
                            endAdornment: <InputAdornment position="start">minutes</InputAdornment>,
                        }}
                        margin="dense"
                    />
                </Box>
            ))}
        </Box>
    )
}
