import * as React from 'react'
import { useEffect, useState } from 'react'
import { Event, Faq, FaqCategory } from '../../../types'
import { useFaq } from '../../../services/hooks/useFaq'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Button, IconButton, Typography } from '@mui/material'
import { ExpandLessSharp, ExpandMore } from '@mui/icons-material'
import { FaqItem } from './FaqItem'
import { LoadingButton } from '@mui/lab'
import { useFirestoreCollectionMutation } from '../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../services/firebase'
import { collection } from '@firebase/firestore'
import { generateFirestoreId } from '../../../utils/generateFirestoreId'

export type FaqCategoryProps = {
    event: Event
    category: FaqCategory
}

export const FaqCategoryItem = (props: FaqCategoryProps) => {
    const categoryId = props.category.id
    const queryResult = useFaq(props.event, categoryId)
    const [isOpen, setOpen] = useState(true)
    const [data, setData] = useState<Faq[]>([])
    const [didChange, setDidChange] = useState(false)
    const mutation = useFirestoreCollectionMutation(collection(collections.faq(props.event.id), categoryId, 'items'))

    useEffect(() => {
        if (queryResult.data && !data.length && !didChange) {
            setData(queryResult.data)
        }
    }, [queryResult])

    if (queryResult.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={queryResult} />
    }

    const updateLocalState = (newData: Faq[]) => {
        setData(newData)
        setDidChange(JSON.stringify(newData) !== JSON.stringify(queryResult.data))
    }

    const addQuestion = () => {
        const d = [...data]
        d.push({
            id: generateFirestoreId(),
            question: '',
            answer: '',
            order: d.length,
        })
        updateLocalState(d)
    }

    const save = () => {
        for (const f of data) {
            mutation.mutate(f, f.id)
        }
    }

    const openContent = isOpen ? (
        <Box>
            {data.map((faq, index) => (
                <FaqItem
                    key={faq.id}
                    faq={faq}
                    onDelete={() => {
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
        </Box>
    ) : null

    return (
        <Box width="100%" mb={4}>
            <Box display="flex">
                <Typography variant="h2" justifyContent="space-between" alignItems="center" marginBottom={1}>
                    {props.category.name} ({data.length})
                    <IconButton onClick={() => setOpen(!isOpen)}>
                        {isOpen ? <ExpandLessSharp /> : <ExpandMore />}
                    </IconButton>
                    {didChange && (
                        <LoadingButton variant="contained" onClick={save} loading={mutation.isLoading}>
                            Save
                        </LoadingButton>
                    )}
                </Typography>
            </Box>
            {openContent}
            <Button onClick={addQuestion} variant="contained" color="secondary" sx={{ mt: 2 }}>
                Add new question to {props.category.name}
            </Button>
        </Box>
    )
}
