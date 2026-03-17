import { useState } from 'react'
import { Checkbox, DialogContentText, FormControlLabel, List, ListItem } from '@mui/material'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Speaker } from '../../../types'

export type DeleteOrphanedSpeakersDialogProps = {
    open: boolean
    loading: boolean
    speakers: Speaker[]
    onClose: () => void
    onAccept: (speakerIds: string[]) => void
}

export const DeleteOrphanedSpeakersDialog = ({
    open,
    loading,
    speakers,
    onClose,
    onAccept,
}: DeleteOrphanedSpeakersDialogProps) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(speakers.map((s) => s.id)))

    // Keep selectedIds in sync when speakers list changes
    if (speakers.length > 0 && selectedIds.size === 0) {
        setSelectedIds(new Set(speakers.map((s) => s.id)))
    }

    return (
        <ConfirmDialog
            open={open}
            title="Delete orphaned speaker(s)?"
            acceptButton="Delete selected speaker(s)"
            disabled={loading || selectedIds.size === 0}
            loading={loading}
            cancelButton="Keep all"
            handleClose={onClose}
            handleAccept={() => onAccept(Array.from(selectedIds))}>
            <DialogContentText>
                The following speaker(s) are not linked to any other session. Do you want to delete them?
            </DialogContentText>
            <List dense>
                {speakers.map((speaker) => (
                    <ListItem key={speaker.id} disablePadding>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedIds.has(speaker.id)}
                                    onChange={(e) => {
                                        setSelectedIds((prev) => {
                                            const next = new Set(prev)
                                            if (e.target.checked) {
                                                next.add(speaker.id)
                                            } else {
                                                next.delete(speaker.id)
                                            }
                                            return next
                                        })
                                    }}
                                />
                            }
                            label={speaker.name}
                        />
                    </ListItem>
                ))}
            </List>
        </ConfirmDialog>
    )
}
