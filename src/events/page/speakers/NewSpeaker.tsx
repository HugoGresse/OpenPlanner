import * as React from 'react'
import { Event, Speaker } from '../../../types'
import {
    Button,
    Card,
    Container,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from '@mui/material'
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
    const [openEmailDialog, setOpenEmailDialog] = React.useState(false)
    const [pendingSpeaker, setPendingSpeaker] = React.useState<Partial<Speaker> | null>(null)

    const saveSpeaker = (speaker: Partial<Speaker>) => {
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
    }

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
                        if (!speaker.email) {
                            setPendingSpeaker(speaker)
                            setOpenEmailDialog(true)
                            return Promise.resolve()
                        }
                        return saveSpeaker(speaker)
                    }}
                />

                {mutation.isError && (
                    <Typography color="error">Error while adding speaker: {mutation.error?.message}</Typography>
                )}
            </Card>

            <Dialog open={openEmailDialog} onClose={() => setOpenEmailDialog(false)}>
                <DialogTitle>Add a speaker without email?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Adding an email address for the speaker is recommended for better communication. Would you like
                        to proceed without an email or go back and add one?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEmailDialog(false)}>Go Back</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setOpenEmailDialog(false)
                            if (pendingSpeaker) {
                                saveSpeaker(pendingSpeaker)
                            }
                        }}
                        autoFocus>
                        Proceed Without Email
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    )
}
