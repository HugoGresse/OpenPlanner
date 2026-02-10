import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useSelector } from 'react-redux'
import { selectUserIdOpenPlanner } from '../../auth/authReducer'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useFirestoreCollectionMutation } from '../../services/hooks/firestoreMutationHooks'
import { collections } from '../../services/firebase'
import LoadingButton from '@mui/lab/LoadingButton'
import { NewEvent, Ticket } from '../../types'
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { useNotification } from '../../hooks/notificationHook'
import { generateApiKey } from '../../utils/generateApiKey'

export type NewEventDialogProps = {
    isOpen: boolean
    onClose: (eventId: string | null) => void
}

const schema = yup
    .object({
        name: yup.string().required(),
        startDate: yup.date().nullable().optional(),
        endDate: yup.date().nullable().optional(),
    })
    .required()

export const NewEventDialog = ({ isOpen, onClose }: NewEventDialogProps) => {
    const userId = useSelector(selectUserIdOpenPlanner)

    const { createNotification } = useNotification()
    const formContext = useForm()
    const { formState, watch, setValue } = formContext

    const mutation = useFirestoreCollectionMutation(collections.events)

    return (
        <Dialog
            open={isOpen}
            onClose={() => onClose(null)}
            maxWidth="md"
            fullWidth={true}
            scroll="body"
            disableRestoreFocus={true}>
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
                            start: data.startDate ? new Date(data.startDate) : null,
                            end: data.endDate ? new Date(data.endDate) : null,
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
                        apiKey: generateApiKey(),
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
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        publicEnabled: false,
                    }
                    mutation
                        .mutate(newEventData)
                        .then(async (eventId: any) => {
                            const defaultTicket: Omit<Ticket, 'id'> = {
                                name: 'Standard',
                                price: 0,
                                currency: 'EUR',
                                url: '',
                                ticketsCount: 100,
                                available: true,
                                soldOut: false,
                                highlighted: false,
                                displayNewsletterRegistration: false,
                                startDate: data.startDate
                                    ? new Date(data.startDate).toISOString().split('T')[0]
                                    : new Date().toISOString().split('T')[0],
                                message: '',
                            }
                            await addDoc(collections.tickets(eventId), defaultTicket)
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
                        autoFocus={isOpen}
                        disabled={formState.isSubmitting}
                    />
                    <Typography sx={{ marginTop: 2 }}>Event dates (optional, can be set later on)</Typography>
                    <TextFieldElement
                        margin="normal"
                        fullWidth
                        id="startDate"
                        label="Start date (optional)"
                        name="startDate"
                        type="datetime-local"
                        InputLabelProps={{ shrink: true }}
                        variant="filled"
                        disabled={formState.isSubmitting}
                        onBlur={(e) => {
                            if (e.target.value && !watch('endDate')) {
                                const start = new Date(e.target.value)
                                const end = new Date(start)
                                end.setHours(end.getHours() + 8)
                                setValue('endDate', end.toISOString().slice(0, 16))
                            }
                        }}
                    />
                    <TextFieldElement
                        margin="normal"
                        fullWidth
                        id="endDate"
                        label="End date (optional)"
                        name="endDate"
                        variant="filled"
                        type="datetime-local"
                        InputLabelProps={{ shrink: true }}
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
