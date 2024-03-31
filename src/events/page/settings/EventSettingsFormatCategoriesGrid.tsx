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

    const categoryColumnType: GridColTypeDef<number[]> = {
        ...GRID_STRING_COL_DEF,
        resizable: false,
        filterable: false,
        sortable: true,
        editable: false,
        renderCell: (params) => {
            if (params.id === 'total' && params.field === 'total') {
                return <b>{params.value}</b>
            } else if (params.id === 'total' || params.field === 'total') {
                return params.value
            }
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
            width: 170,
        },
    ]
        .concat(
            event.formats.map((format) => ({
                ...categoryColumnType,
                field: format.id,
                headerName: format.name,
                width: 170,
                type: 'number',
            }))
        )
        .concat({
            ...categoryColumnType,
            field: 'total',
            headerName: 'Total',
            type: 'number',
            width: 150,
        })

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
        total: event.formats.reduce((acc, format) => {
            return (
                acc +
                (sessions.data?.filter((session) => session.category === category.id && session.format === format.id)
                    .length || 0)
            )
        }, 0),
    }))

    rows.push({
        id: 'total',
        category: 'Total',
        ...event.formats.reduce((acc, format) => {
            return {
                ...acc,
                [format.id]: sessions.data?.filter((session) => session.format === format.id).length || 0,
            }
        }, {}),
        total: sessions.data?.length || 0,
    })

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
