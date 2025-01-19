import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import * as React from 'react'
import { useSelector } from 'react-redux'
import { selectUserIdOpenPlanner } from '../../auth/authReducer'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useFirestoreCollectionMutation } from '../../services/hooks/firestoreMutationHooks'
import { collections } from '../../services/firebase'
import LoadingButton from '@mui/lab/LoadingButton'
import { NewEvent } from '../../types'
import { serverTimestamp } from 'firebase/firestore'
import { useNotification } from '../../hooks/notificationHook'

export type NewEventDialogProps = {
    isOpen: boolean
    onClose: (eventId: string | null) => void
}

const schema = yup
    .object({
        name: yup.string().required(),
    })
    .required()

export const NewEventDialog = ({ isOpen, onClose }: NewEventDialogProps) => {
    const userId = useSelector(selectUserIdOpenPlanner)

    const { createNotification } = useNotification()
    const formContext = useForm()
    const { formState } = formContext

    const mutation = useFirestoreCollectionMutation(collections.events)

    return (
        <Dialog open={isOpen} onClose={() => onClose(null)} maxWidth="md" fullWidth={true} scroll="body">
            <DialogTitle>New event creation</DialogTitle>

            <FormContainer
                formContext={formContext}
                // @ts-ignore
                resolver={yupResolver(schema)}
                onSuccess={async (data) => {
                    const newEventData: NewEvent = {
                        name: data.name,
                        owner: userId,
                        members: [userId],
                        scheduleVisible: true,
                        conferenceHallId: null,
                        dates: {
                            start: null,
                            end: null,
                        },
                        formats: [],
                        categories: [],
                        tracks: [],
                        webhooks: [],
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        files: null,
                        statusBadgeImage: null,
                        statusBadgeLink: null,
                        apiKey: null,
                        openAPIKey: null,
                        gladiaAPIKey: null,
                        transcriptionPassword: null,
                        enableVoxxrin: false,
                        aiSettings: null,
                        shortVidSettings: null,
                        locationName: null,
                        locationUrl: null,
                        logoUrl: null,
                        logoUrl2: null,
                        backgroundUrl: null,
                        color: null,
                        colorSecondary: null,
                        colorBackground: null,
                        publicEnabled: false,
                    }
                    mutation
                        .mutate(newEventData)
                        .then((eventId: any) => {
                            onClose(eventId)
                        })
                        .catch((error: Error) => {
                            createNotification('Error while creating event: ' + error.message, { type: 'error' })
                            console.error('error creating event', error)
                        })
                }}>
                <DialogContent>
                    <TextFieldElement
                        margin="normal"
                        required
                        fullWidth
                        id="name"
                        label="Event name"
                        name="name"
                        variant="filled"
                        disabled={formState.isSubmitting}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => onClose(null)}>Cancel</Button>
                    <LoadingButton
                        type="submit"
                        disabled={formState.isSubmitting}
                        loading={formState.isSubmitting}
                        variant="contained"
                        sx={{ mt: 2, mb: 2 }}>
                        Create event
                    </LoadingButton>
                </DialogActions>
            </FormContainer>
        </Dialog>
    )
}
