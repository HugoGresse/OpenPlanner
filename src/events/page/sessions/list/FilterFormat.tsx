import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import * as React from 'react'
import { Event } from '../../../../types'

export type FilterSelectProps = {
    event: Event
    selectedFormat: string
    setSelectedFormat: (value: string) => void
}

export const FilterFormat = ({ selectedFormat, setSelectedFormat, event }: FilterSelectProps) => {
    return (
        <FormControl fullWidth size="small" margin="normal">
            <InputLabel id="format1">Format</InputLabel>
            <Select
                labelId="format1"
                id="format"
                value={selectedFormat}
                label="Format"
                onChange={(e) => setSelectedFormat(e.target.value as string)}>
                <MenuItem value="">All</MenuItem>
                {event.formats.map((format) => (
                    <MenuItem key={format.id} value={format.id}>
                        {format.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}
