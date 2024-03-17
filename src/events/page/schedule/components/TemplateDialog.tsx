import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import * as React from 'react'
import { useSessionTemplate } from '../../../../services/hooks/useSessionsTemplate'
import { Event } from '../../../../types'
import { DataGrid, GridColDef, GridValueFormatterParams } from '@mui/x-data-grid'
import { updateSessionsTemplateAtOnce } from '../../../actions/sessions/updateSessionsTemplateAtOnce'
import { useNotification } from '../../../../hooks/notificationHook'
import { useSessions } from '../../../../services/hooks/useSessions'

type TemplateDialogProps = {
    event: Event
    isOpen: boolean
    onClose: () => void
}

export const TemplateDialog = ({ event, isOpen, onClose }: TemplateDialogProps) => {
    const sessionsTemplate = useSessionTemplate(event)
    const sessions = useSessions(event)
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
            headerName: format.name + ' (actual)',
            width: 150,
            type: 'number',
            editable: true,
            valueParser: (value: any) => {
                // Only accept number
                const parsed = parseInt(value, 10)
                if (isNaN(parsed)) {
                    return 0
                }
                return parsed
            },
            valueFormatter: (params: GridValueFormatterParams<number>) => {
                const existingSessionsCount = sessions.data?.filter(
                    (session) => session.category === params.id && session.format === format.id
                ).length
                if (params.value == null) {
                    return 0
                }
                return `${params.value} (${existingSessionsCount || 0})`
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
            <DialogTitle>Template config</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Define the number of sessions for each category and format. Removing some will delete starting from
                    the end. Double click to edit. The number in parenthesis is the actual number of sessions for this
                    category and format (and not the template count).
                </DialogContentText>

                <DataGrid
                    rows={rows}
                    columns={columns}
                    disableRowSelectionOnClick
                    hideFooter
                    disableColumnMenu
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
