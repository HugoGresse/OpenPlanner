import * as React from 'react'
import { Event, Speaker } from '../../../types'
import { Button, Card, Container, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { collections } from '../../../services/firebase'
import { useLocation } from 'wouter'
import { EventSpeakerForm } from './EventSpeakerForm'
import { useFirestoreCollectionMutation } from '../../../services/hooks/firestoreMutationHooks'

export type NewSpeakerProps = {
    event: Event
}
export const NewSpeaker = ({ event }: NewSpeakerProps) => {
    const [_, setLocation] = useLocation()
    const mutation = useFirestoreCollectionMutation(collections.speakers(event.id))

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Card sx={{ paddingX: 2 }}>
                <Button href="/speakers" startIcon={<ArrowBack />}>
                    Cancel
                </Button>

                <Typography variant="h2">New speaker</Typography>

                <EventSpeakerForm
                    event={event}
                    onSubmit={(speaker) => {
                        return mutation
                            .mutate({
                                name: speaker.name,
                                bio: speaker.bio || null,
                                email: speaker.email || null,
                                phone: speaker.phone || null,
                                jobTitle: speaker.jobTitle || null,
                                company: speaker.company || null,
                                companyLogoUrl: speaker.companyLogoUrl || null,
                                geolocation: speaker.geolocation || null,
                                photoUrl: speaker.photoUrl || null,
                                note: speaker.note || null,
                                socials: speaker.socials,
                            } as Speaker)
                            .then(() => {
                                setLocation('/speakers')
                            })
                    }}
                />

                {mutation.isError && (
                    <Typography color="error">Error while adding speaker: {mutation.error?.message}</Typography>
                )}
            </Card>
        </Container>
    )
}
