import * as React from 'react'
import { useEffect, useState } from 'react'
import { Event, Faq, FaqCategory } from '../../../types'
import { useFaq } from '../../../services/hooks/useFaq'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Button, FormControlLabel, IconButton, Switch, Typography } from '@mui/material'
import { ExpandLessSharp, ExpandMore } from '@mui/icons-material'
import { FaqItem } from './FaqItem'
import { LoadingButton } from '@mui/lab'
import {
    useFirestoreCollectionMutation,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../services/firebase'
import { collection } from '@firebase/firestore'
import { generateFirestoreId } from '../../../utils/generateFirestoreId'
import { doc } from 'firebase/firestore'
import { TypographyCopyable } from '../../../components/TypographyCopyable'

export type FaqCategoryProps = {
    event: Event
    category: FaqCategory
}

const getFaqCategoryPrivateLink = (event: Event, publicCategoryId: string) => {
    const port = window.location.port
    const domainName = window.location.hostname + (port ? `:${port}` : '')
    const protocol = window.location.protocol

    return `${protocol}//${domainName}/public/event/${event.id}/faq/${publicCategoryId}`
}

export const FaqCategoryItem = (props: FaqCategoryProps) => {
    const categoryId = props.category.id
    const queryResult = useFaq(props.event, categoryId)
    const [isOpen, setOpen] = useState(false)
    const [data, setData] = useState<Faq[]>([])
    const [didChange, setDidChange] = useState(false)
    const categoryMutation = useFirestoreDocumentMutation(doc(collections.faq(props.event.id), categoryId))
    const mutation = useFirestoreCollectionMutation(collection(collections.faq(props.event.id), categoryId, 'items'))

    useEffect(() => {
        if (queryResult.loaded) {
            setData(queryResult.data || [])
            setDidChange(false)
        }
    }, [queryResult.data])

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

    const save = async () => {
        for (const f of data) {
            await mutation.mutate(f, f.id)
        }
        setDidChange(false)
    }

    const openContent = isOpen ? (
        <Box>
            <Box>
                <FormControlLabel
                    control={
                        <Switch
                            checked={props.category.share}
                            onChange={(e) => {
                                const newCategory = {
                                    share: e.target.checked,
                                    private: props.category.private !== undefined ? props.category.private : false,
                                    privateId:
                                        props.category.privateId !== undefined
                                            ? props.category.privateId
                                            : generateFirestoreId(),
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
                            checked={props.category.private}
                            onChange={(e) => {
                                categoryMutation.mutate({ private: e.target.checked })
                            }}
                        />
                    }
                    label="Private url?"
                />
                {props.category.private && props.category.privateId ? (
                    <TypographyCopyable component="a">
                        {getFaqCategoryPrivateLink(props.event, props.category.privateId)}
                    </TypographyCopyable>
                ) : null}
            </Box>
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
