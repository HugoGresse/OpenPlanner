import * as React from 'react'
import { useState } from 'react'
import { Box, TextField, Typography } from '@mui/material'
import { useFirestoreCollectionMutation } from '../../../services/hooks/firestoreMutationHooks'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { collections } from '../../../services/firebase'
import { slugify } from '../../../utils/slugify'

export type NewFaqCategoryDialogProps = {
    open: boolean
    onClose: () => void
    eventId: string
    categoryCount: number
}
export const NewFaqCategoryDialog = ({ open, onClose, eventId, categoryCount }: NewFaqCategoryDialogProps) => {
    const [value, setValue] = useState<string>('')
    const mutation = useFirestoreCollectionMutation(collections.faq(eventId))

    return (
        <ConfirmDialog
            open={open}
            handleClose={onClose}
            loading={false}
            title="Add a new FAQ category"
            acceptButton="Add"
            cancelButton="cancel"
            handleAccept={() => {
                return mutation
                    .mutate(
                        {
                            name: value,
                            order: categoryCount,
                        },
                        slugify(value)
                    )
                    .then(onClose)
            }}>
            <Box marginY={1} sx={{ minWidth: '20vw' }}>
                <TextField
                    name="Category name"
                    label={'Category name'}
                    autoFocus
                    fullWidth
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />

                {mutation.isError && (
                    <Typography color="error">Error while adding category: {mutation.error?.message}</Typography>
                )}
            </Box>
        </ConfirmDialog>
    )
}
