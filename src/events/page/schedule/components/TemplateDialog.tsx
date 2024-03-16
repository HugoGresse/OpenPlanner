import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import * as React from 'react'
import { useSessionTemplate } from '../../../../services/hooks/useSessionsTemplate'
import { Event } from '../../../../types'
import { DataGrid, GridCellParams, GridColDef } from '@mui/x-data-grid'
import { updateSessionsTemplateAtOnce } from '../../../actions/sessions/updateSessionsTemplateAtOnce'
import { useNotification } from '../../../../hooks/notificationHook'

type TemplateDialogProps = {
    event: Event
    isOpen: boolean
    onClose: () => void
}

export const TemplateDialog = ({ event, isOpen, onClose }: TemplateDialogProps) => {
    const sessionsTemplate = useSessionTemplate(event)
    const { createNotification } = useNotification()

    const columns: GridColDef[] = [
        {
            field: 'category',
            headerName: 'Category',
            width: 150,
        },
    ].concat(
        event.formats.map((format) => ({
            field: format.id,
            headerName: format.name,
            width: 150,
            editable: true,
            valueParser: (value: any, params: GridCellParams) => {
                // Only accept number
                const parsed = parseInt(value, 10)
                if (isNaN(parsed)) {
                    return 0
                }
                return parsed
            },
        }))
    )

    const rows = event.categories.map((category) => ({
        id: category.id,
        category: category.name,
        ...event.formats.reduce((acc, format) => {
            return {
                ...acc,
                [format.id]:
                    sessionsTemplate.data?.filter(
                        (session) => session.category === category.id && session.format === format.id
                    ).length || 0,
            }
        }, {}),
    }))

    return (
        <Dialog open={isOpen} onClose={() => onClose()} maxWidth="md" fullWidth={true} scroll="body">
            <DialogTitle>Schedule template</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    The goal is to have a template (format, categories, duration) which will be behind the schedule.
                </DialogContentText>

                <DataGrid
                    rows={rows}
                    columns={columns}
                    disableRowSelectionOnClick
                    hideFooter
                    processRowUpdate={async (updatedRow) => {
                        const { success, error } = await updateSessionsTemplateAtOnce(
                            event,
                            sessionsTemplate.data || [],
                            updatedRow
                        )

                        if (!success) {
                            createNotification('Error updating: ' + error, { type: 'error' })
                            return rows
                        }

                        return updatedRow
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose()}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}
