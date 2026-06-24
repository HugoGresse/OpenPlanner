import * as yup from 'yup'
import { Event, EventSettingForForm } from '../../../types'
import { useEffect } from 'react'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { FormContainer, useForm, SwitchElement } from 'react-hook-form-mui'
import { Card, Container, Grid, Typography, Box } from '@mui/material'
import { yupResolver } from '@hookform/resolvers/yup'
import { mapEventDevSettingsFormToMutateObject } from '../settings/mapEventSettingsFormToMutateObject'
import LoadingButton from '@mui/lab/LoadingButton'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { TypographyCopyable } from '../../../components/TypographyCopyable'
import { PdfScheduleSection } from '../../../components/PdfScheduleSection'

const schema = yup
    .object({
        name: yup.string().required(),
        publicEnabled: yup.boolean().optional(),
    })
    .required()

const convertInputEvent = (event: Event): EventSettingForForm => {
    return {
        ...event,
        webhooks: event.webhooks || [],
        apiKey: event.apiKey,
        publicEnabled: event.publicEnabled || false,
        repoUrl: event.repoUrl || null,
        repoToken: event.repoToken || null,
    }
}

export type EventPublicProps = {
    event: Event
}
export const EventPublic = ({ event }: EventPublicProps) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))

    const formContext = useForm({
        defaultValues: convertInputEvent(event),
    })
    const { formState, reset, watch } = formContext
    const publicEnabled = watch('publicEnabled')

    useEffect(() => {
        reset(convertInputEvent(event))
    }, [event])

    const eventPublicUrl = `${window.location.protocol}//${window.location.host}/public/event/${event.id}`

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <FormContainer
                formContext={formContext}
                // @ts-ignore
                resolver={yupResolver(schema)}
                onSuccess={async (data) => {
                    return mutation.mutate(mapEventDevSettingsFormToMutateObject(event, data))
                }}>
                <Typography component="h1" variant="h5">
                    Public
                </Typography>

                <Card sx={{ paddingX: 2, mt: 2 }}>
                    <Typography fontSize="large" sx={{ mt: 2, mb: 2 }}>
                        Website
                    </Typography>
                    <Box mb={2}>
                        <SwitchElement label="Enable public website" name="publicEnabled" />
                        {publicEnabled && (
                            <Box mt={1}>
                                <TypographyCopyable>{eventPublicUrl}</TypographyCopyable>
                            </Box>
                        )}
                    </Box>

                    <PdfScheduleSection event={event} />

                    <Grid item xs={12}>
                        <LoadingButton
                            type="submit"
                            disabled={formState.isSubmitting}
                            loading={formState.isSubmitting}
                            fullWidth
                            variant="contained"
                            sx={{ mt: 2, mb: 2 }}>
                            Save
                        </LoadingButton>
                    </Grid>
                </Card>
                <SaveShortcut />
            </FormContainer>
        </Container>
    )
}
