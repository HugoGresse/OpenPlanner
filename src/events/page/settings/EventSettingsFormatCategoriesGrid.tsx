import { DataGrid, GRID_STRING_COL_DEF, GridColDef, GridColTypeDef } from '@mui/x-data-grid'
import * as React from 'react'
import { useSessions } from '../../../services/hooks/useSessions'
import { Event } from '../../../types'
import { Box, Chip, Typography } from '@mui/material'
import { useLocation } from 'wouter'

type EventSettingsFormatCategoriesGridProps = {
    event: Event
}

export const EventSettingsFormatCategoriesGrid = ({ event }: EventSettingsFormatCategoriesGridProps) => {
    const sessions = useSessions(event)
    const [_, setLocation] = useLocation()

    event.categories

    const categoryColumnType: GridColTypeDef<number[]> = {
        ...GRID_STRING_COL_DEF,
        resizable: false,
        filterable: false,
        sortable: true,
        editable: false,
        renderCell: (params) => {
            return (
                <Chip
                    label={params.value}
                    component="a"
                    clickable
                    href={`/events/${event.id}/sessions?category=${params.id}&format=${params.field}`}
                    onClick={(e) => {
                        e.preventDefault()
                        setLocation(`/sessions?category=${params.id}&format=${params.field}`)
                    }}
                />
            )
        },
    }

    const columns: GridColDef[] = [
        {
            ...categoryColumnType,
            field: 'category',
            headerName: 'Category',
            width: 150,
        },
    ].concat(
        event.formats.map((format) => ({
            ...categoryColumnType,
            field: format.id,
            headerName: format.name,
            width: 150,
            type: 'number',
        }))
    )

    const rows = event.categories.map((category) => ({
        id: category.id,
        category: category.name,
        ...event.formats.reduce((acc, format) => {
            return {
                ...acc,
                [format.id]:
                    sessions.data?.filter((session) => session.category === category.id && session.format === format.id)
                        .length || 0,
            }
        }, {}),
    }))

    return (
        <>
            <Typography fontWeight="600" mt={2}>
                Format Categories count
            </Typography>
            <Box>
                <DataGrid rows={rows} columns={columns} disableRowSelectionOnClick hideFooter disableColumnMenu />
            </Box>
        </>
    )
}
