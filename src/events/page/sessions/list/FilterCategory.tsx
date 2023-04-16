import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import * as React from 'react'
import { useEffect } from 'react'
import { Category, Event, Session } from '../../../../types'

export type FilterSelectProps = {
    event: Event
    selectedCategory: string
    setSelectedCategory: (value: string) => void
    sessions: Session[]
}

type CategoryWithCount = Category & { count: number }

export const FilterCategory = ({ selectedCategory, setSelectedCategory, event, sessions }: FilterSelectProps) => {
    const [categories, setCategories] = React.useState<CategoryWithCount[]>([])

    useEffect(() => {
        setCategories(
            event.categories.map((category) => {
                return {
                    id: category.id,
                    name: category.name,
                    count: sessions.filter((session) => session.category === category.id).length,
                }
            })
        )
    }, [sessions, event.categories])

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
                {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                        {category.name} ({category.count} total)
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}
