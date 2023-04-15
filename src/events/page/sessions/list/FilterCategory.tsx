import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import * as React from 'react'
import { Event } from '../../../../types'

export type FilterSelectProps = {
    event: Event
    selectedCategory: string
    setSelectedCategory: (value: string) => void
}

export const FilterCategory = ({ selectedCategory, setSelectedCategory, event }: FilterSelectProps) => {
    return (
        <FormControl fullWidth size="small" margin="normal">
            <InputLabel id="category1">Category</InputLabel>
            <Select
                labelId="category1"
                id="category"
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value as string)}>
                <MenuItem value="">All</MenuItem>
                {event.categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                        {category.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}
