import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import * as React from 'react'
import { useEffect } from 'react'
import { Event, Format, Session } from '../../../../types'

export type FilterSelectProps = {
    event: Event
    selectedFormat: string
    setSelectedFormat: (value: string) => void
    sessions: Session[]
}

type FormatWithCount = Format & { count: number }

export const FilterFormat = ({ selectedFormat, setSelectedFormat, event, sessions }: FilterSelectProps) => {
    const [formats, setFormats] = React.useState<FormatWithCount[]>([])

    useEffect(() => {
        console.log(sessions, event.formats)
        setFormats(
            event.formats.map((format) => {
                return {
                    id: format.id,
                    name: format.name,
                    durationMinutes: format.durationMinutes,
                    count: sessions.filter((session) => session.format === format.id).length,
                }
            })
        )
    }, [sessions, event.formats])

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
                {formats.map((format) => (
                    <MenuItem key={format.id} value={format.id}>
                        {format.name} ({format.count} total)
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}
