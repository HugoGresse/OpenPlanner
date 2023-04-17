import * as React from 'react'
import { useLocation } from 'wouter'
import { useFirestoreDocumentMutation } from '@react-query-firebase/firestore'
import { collections } from '../../../services/firebase'
import { Button, Card, Container, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { Event, SponsorCategory } from '../../../types'
import { getQueryParams } from '../../../utils/getQuerySearchParameters'
import { arrayUnion, doc } from 'firebase/firestore'
import { SponsorForm } from './components/SponsorForm'
import { v4 as uuidv4 } from 'uuid'

export type NewSponsorProps = {
    event: Event
}
export const NewSponsor = ({ event }: NewSponsorProps) => {
    const [_, setLocation] = useLocation()
    const categoryId = getQueryParams().categoryId
    const mutation = useFirestoreDocumentMutation(doc(collections.sponsors(event.id), categoryId), {
        merge: true,
    })

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Button href="/sponsors" startIcon={<ArrowBack />}>
                Cancel
            </Button>
            <Card sx={{ paddingX: 2 }}>
                <Typography variant="h2">New sponsor</Typography>

                <SponsorForm
                    event={event}
                    onSubmit={(sponsor) => {
                        return mutation
                            .mutateAsync({
                                sponsors: arrayUnion({
                                    ...sponsor,
                                    id: uuidv4(),
                                }),
                            } as unknown as SponsorCategory)
                            .then(() => {
                                setLocation('/sponsors')
                            })
                    }}
                />

                {mutation.isError && (
                    <Typography color="error">Error while adding sponsor: {mutation.error.message}</Typography>
                )}
            </Card>
        </Container>
    )
}
