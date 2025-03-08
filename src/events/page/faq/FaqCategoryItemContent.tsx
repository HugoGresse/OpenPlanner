import * as React from 'react'
import { useState } from 'react'
import { Box, Button, DialogContentText, FormControlLabel, Switch, TextField } from '@mui/material'
import { generateFirestoreId } from '../../../utils/generateFirestoreId'
import { TypographyCopyable } from '../../../components/TypographyCopyable'
import { getFaqCategoryPrivateLink } from './faqLink'
import { FaqItem } from './FaqItem'
import { Event, Faq, FaqCategory } from '../../../types'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { DeleteRounded, EditRounded } from '@mui/icons-material'
import { ConfirmDialog } from '../../../components/ConfirmDialog'

export type FaqCategoryItemContentProps = {
    event: Event
    category: FaqCategory
    data: Omit<Faq, 'updatedAt' | 'createdAt'>[]
    deletedItems: string[]
    setDeletedItems: (deletedItems: string[]) => void
    updateLocalState: (faqItems: Omit<Faq, 'updatedAt' | 'createdAt'>[]) => void
}
export const FaqCategoryItemContent = ({
    event,
    category,
    data,
    deletedItems,
    setDeletedItems,
    updateLocalState,
}: FaqCategoryItemContentProps) => {
    const categoryMutation = useFirestoreDocumentMutation(doc(collections.faq(event.id), category.id))
    const [isDeletingCategory, setIsDeletingCategory] = useState<boolean>(false)
    const [isChangingCategoryName, setIsChangingCategoryName] = useState<null | string>(null)
    const categoryDocumentDeletion = useFirestoreDocumentDeletion(doc(collections.faq(event.id), category.id))

    return (
        <Box>
            <Box>
                <FormControlLabel
                    control={
                        <Switch
                            checked={category.share}
                            onChange={(e) => {
                                const newCategory = {
                                    share: e.target.checked,
                                    private: category.private !== undefined ? category.private : false,
                                    privateId:
                                        category.privateId !== undefined ? category.privateId : generateFirestoreId(),
                                }
                                categoryMutation.mutate(newCategory)
                            }}
                        />
                    }
                    label="Share online"
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={category.private}
                            onChange={(e) => {
                                categoryMutation.mutate({ private: e.target.checked })
                            }}
                        />
                    }
                    label="Private url?"
                />
                {category.private && category.privateId ? (
                    <TypographyCopyable component="a">
                        {getFaqCategoryPrivateLink(event, category.privateId)}
                    </TypographyCopyable>
                ) : null}
                <Button startIcon={<DeleteRounded />} onClick={() => setIsDeletingCategory(true)}>
                    Delete "{category.name}" category
                </Button>
                <Button startIcon={<EditRounded />} onClick={() => setIsChangingCategoryName(category.name)}>
                    Change category name
                </Button>
                {isChangingCategoryName ? (
                    <Box width="100%">
                        <TextField
                            label="Category name"
                            value={isChangingCategoryName}
                            onChange={(e) => {
                                setIsChangingCategoryName(e.target.value)
                            }}
                        />
                        <Button
                            onClick={() => {
                                categoryMutation.mutate({ name: isChangingCategoryName })
                                setIsChangingCategoryName(null)
                            }}>
                            Save
                        </Button>
                    </Box>
                ) : null}
            </Box>
            {data.map((faq, index) => (
                <FaqItem
                    key={faq.id}
                    faq={faq}
                    onDelete={() => {
                        setDeletedItems([...deletedItems, faq.id])
                        const d = [...data]
                        d.splice(index, 1)
                        updateLocalState(d)
                    }}
                    onChange={(newFaq) => {
                        const d = [...data]
                        d[index] = newFaq
                        updateLocalState(d)
                    }}
                />
            ))}
            <ConfirmDialog
                open={isDeletingCategory}
                title="Delete this FAQ category?"
                acceptButton={`Delete ${category.name} category`}
                disabled={categoryDocumentDeletion.isLoading}
                loading={categoryDocumentDeletion.isLoading}
                cancelButton="cancel"
                handleClose={() => setIsDeletingCategory(false)}
                handleAccept={async () => {
                    await categoryDocumentDeletion.mutate()
                    setIsDeletingCategory(false)
                }}>
                <DialogContentText id="alert-dialog-description">
                    {' '}
                    Delete the category "{category.name}" from this FAQ?
                </DialogContentText>
            </ConfirmDialog>
        </Box>
    )
}
