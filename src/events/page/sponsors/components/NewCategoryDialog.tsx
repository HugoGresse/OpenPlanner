import * as React from 'react'
import { ConfirmDialog } from '../../../../components/ConfirmDialog'
import { Box, TextField, Typography } from '@mui/material'
import { useFirestoreCollectionMutation } from '@react-query-firebase/firestore'
import { collections } from '../../../../services/firebase'

export type NewCategoryDialogProps = {
    open: boolean
    onClose: () => void
    eventId: string
}
export const NewCategoryDialog = ({ open, onClose, eventId }: NewCategoryDialogProps) => {
    const [value, setValue] = React.useState<string>('')
    const mutation = useFirestoreCollectionMutation(collections.sponsors(eventId))

    return (
        <ConfirmDialog
            open={open}
            handleClose={onClose}
            loading={false}
            title="Add a new category"
            acceptButton="Add"
            cancelButton="cancel"
            handleAccept={() => {
                return mutation
                    .mutateAsync({
                        name: value,
                        sponsors: [],
                    })
                    .then(onClose)
            }}>
            <Box marginY={1} sx={{ minWidth: '30vw' }}>
                <TextField
                    name="Category name"
                    label={'Category name'}
                    autoFocus
                    fullWidth
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />

                {mutation.isError && (
                    <Typography color="error">Error while adding session: {mutation.error.message}</Typography>
                )}
            </Box>
        </ConfirmDialog>
    )
}
