import * as yup from 'yup'
import { Event, EventSettingForForm } from '../../../types'
import * as React from 'react'
import { useEffect } from 'react'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { FormContainer, useForm } from 'react-hook-form-mui'
import { Card, Container, Grid, Typography } from '@mui/material'
import { yupResolver } from '@hookform/resolvers/yup'
import { mapEventDevSettingsFormToMutateObject } from '../settings/mapEventSettingsFormToMutateObject'
import { WebhooksFields } from '../settings/components/WebhooksFields'
import { EventStaticApiFilePaths } from '../settings/components/EventStaticApiFilePaths'
import LoadingButton from '@mui/lab/LoadingButton'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { TextFieldElementWithGenerateApiKeyButton } from '../../../components/form/TextFieldElementWithGenerateApiKeyButton'

const schema = yup
    .object({
        name: yup.string().required(),
    })
    .required()

const convertInputEvent = (event: Event): EventSettingForForm => {
    return {
        ...event,
    }
}

export type APIProps = {
    event: Event
}
export const API = ({ event }: APIProps) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))

    const formContext = useForm({
        defaultValues: convertInputEvent(event),
    })
    const { control, formState, reset } = formContext

    useEffect(() => {
        reset(convertInputEvent(event))
    }, [event])

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <FormContainer
                formContext={formContext}
                // @ts-ignore
                resolver={yupResolver(schema)}
                onSuccess={async (data) => {
                    console.log(data)

                    return mutation.mutate(mapEventDevSettingsFormToMutateObject(event, data))
                }}>
                <Card sx={{ padding: 2 }}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Typography component="h2" variant="h5">
                                APIs
                            </Typography>
                            <EventStaticApiFilePaths event={event} />

                            <Typography fontWeight="600" mt={2}>
                                Dynamic API (slow, not cached, read/write, work in progress)
                            </Typography>
                            <Typography fontWeight="600" mt={2} component="a" href="https://openplanner.fr/api/docs">
                                Docs
                            </Typography>
                            <TextFieldElementWithGenerateApiKeyButton
                                required={true}
                                fullWidth={true}
                                id="apiKey"
                                label="API Key"
                                name="apiKey"
                                disabled={true}
                                helperText="use as params ?apiKey=xxx"
                                buttonText="Generate new API Key"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography component="h2" variant="h5">
                                Deployments
                            </Typography>
                            <WebhooksFields control={control} isSubmitting={formState.isSubmitting} event={event} />
                        </Grid>

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
                    </Grid>
                </Card>
                <SaveShortcut />
            </FormContainer>
        </Container>
    )
}
