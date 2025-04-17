import { useEffect, useState } from 'react'
import { Event, Faq, FaqCategory } from '../../../types'
import { useFaq } from '../../../services/hooks/useFaq'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Button, IconButton, Typography } from '@mui/material'
import { ExpandLessSharp, ExpandMore, PictureAsPdf } from '@mui/icons-material'
import { LoadingButton } from '@mui/lab'
import {
    useFirestoreCollectionMutation,
    useFirestoreDocumentDeletion,
} from '../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../services/firebase'
import { collection } from '@firebase/firestore'
import { generateFirestoreId } from '../../../utils/generateFirestoreId'
import { FaqCategoryItemContent } from './FaqCategoryItemContent'

export type FaqCategoryProps = {
    event: Event
    category: FaqCategory
}

export const FaqCategoryItem = (props: FaqCategoryProps) => {
    const categoryId = props.category.id
    const queryResult = useFaq(props.event, categoryId)
    const [isOpen, setOpen] = useState(false)
    const [data, setData] = useState<Omit<Faq, 'updatedAt' | 'createdAt'>[]>([])
    const [deletedItems, setDeletedItems] = useState<string[]>([])
    const [didChange, setDidChange] = useState(false)
    const mutation = useFirestoreCollectionMutation(collection(collections.faq(props.event.id), categoryId, 'items'))
    const deletionMutation = useFirestoreDocumentDeletion(
        collection(collections.faq(props.event.id), categoryId, 'items')
    )
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        if (queryResult.loaded) {
            setData(queryResult.data || [])
            setDidChange(false)
        }
    }, [queryResult.data])

    if (queryResult.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={queryResult} />
    }

    const updateLocalState = (newData: Omit<Faq, 'updatedAt' | 'createdAt'>[]) => {
        setData(newData)
        setDidChange(JSON.stringify(newData) !== JSON.stringify(queryResult.data))
    }

    const addQuestion = () => {
        const d: Omit<Faq, 'updatedAt' | 'createdAt'>[] = [...data]
        d.push({
            id: generateFirestoreId(),
            question: '',
            answer: '',
            order: d.length,
        })
        updateLocalState(d)
    }

    const save = async () => {
        const promises = data.map((faq) => {
            return mutation.mutate(faq, faq.id)
        })
        promises.push(
            ...deletedItems.map((id) => {
                return deletionMutation.mutate(id)
            })
        )

        await Promise.all(promises)
        setDeletedItems([])
        setDidChange(false)
    }

    return (
        <Box width="100%" mb={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h4" marginBottom={1}>
                    {props.category.name} ({data.length})
                </Typography>
                <Box>
                    <IconButton onClick={() => setOpen(!isOpen)}>
                        {isOpen ? <ExpandLessSharp /> : <ExpandMore />}
                    </IconButton>
                    {didChange && (
                        <LoadingButton variant="contained" onClick={save} loading={mutation.isLoading}>
                            Save
                        </LoadingButton>
                    )}
                </Box>
            </Box>
            {isOpen ? (
                <>
                    <FaqCategoryItemContent
                        event={props.event}
                        category={props.category}
                        data={data}
                        deletedItems={deletedItems}
                        setDeletedItems={setDeletedItems}
                        updateLocalState={updateLocalState}
                    />
                    <Button onClick={addQuestion} variant="contained" color="secondary" sx={{ mt: 2 }}>
                        Add new question to {props.category.name}
                    </Button>
                </>
            ) : null}
        </Box>
    )
}
