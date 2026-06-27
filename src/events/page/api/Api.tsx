import * as yup from 'yup'
import { Event, EventSettingForForm } from '../../../types'
import { useEffect, useState } from 'react'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { FormContainer, useForm } from 'react-hook-form-mui'
import { Card, Container, Grid, Typography, Box, IconButton, Collapse, Button } from '@mui/material'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { Link } from 'wouter'
import { yupResolver } from '@hookform/resolvers/yup'
import { mapEventDevSettingsFormToMutateObject } from '../settings/mapEventSettingsFormToMutateObject'
import { WebhooksFields } from '../settings/components/WebhooksFields'
import { RepoFields } from '../settings/components/RepoFields'
import { EventStaticApiFilePaths } from '../settings/components/EventStaticApiFilePaths'
import LoadingButton from '@mui/lab/LoadingButton'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { TextFieldElementWithGenerateApiKeyButton } from '../../../components/form/TextFieldElementWithGenerateApiKeyButton'
import { TextFieldElementPrivate } from '../../../components/form/TextFieldElementPrivate'

const schema = yup
    .object({
        name: yup.string().required(),
        publicEnabled: yup.boolean().optional(),
        apiKey: yup.string().nullable(),
        webhooks: yup.array().of(
            yup.object({
                url: yup.string(),
                token: yup.string().nullable(),
                lastAnswer: yup.string().nullable(),
            })
        ),
        repoUrl: yup.string().nullable(),
        workflowRunId: yup.string().nullable(),
        token: yup.string().nullable(),
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

export type APIProps = {
    event: Event
}
export const API = ({ event }: APIProps) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))
    const [expandedAPI, setExpandedAPI] = useState(true)
    const [expandedDeploy, setExpandedDeploy] = useState(true)

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
                    return mutation.mutate(mapEventDevSettingsFormToMutateObject(event, data))
                }}>
                <Typography component="h1" variant="h5">
                    Integration & API
                </Typography>

                <Card sx={{ paddingX: 2, mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                        <Typography fontSize="large" sx={{ mt: 2 }}>
                            APIs
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => setExpandedAPI(!expandedAPI)}
                            sx={{
                                transform: expandedAPI ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: '0.3s',
                            }}>
                            <ExpandMoreIcon />
                        </IconButton>
                    </Box>
                    <Collapse in={expandedAPI}>
                        <EventStaticApiFilePaths event={event} />

                        <Typography fontWeight="600" mt={5}>
                            Dynamic API (slow, not cached, read/write, work in progress)
                        </Typography>
                        <Typography fontWeight="600" mt={2} component="a" href="https://api.openplanner.fr/">
                            Docs
                        </Typography>
                        <TextFieldElementPrivate
                            margin="normal"
                            fullWidth
                            id="id"
                            label="Event ID"
                            name="id"
                            disabled={true}
                            showFullText={true}
                            value={event.id}
                        />
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
                    </Collapse>
                </Card>

                <Card sx={{ paddingX: 2, mt: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
                        <Box>
                            <Typography fontSize="large">WhatsApp (track management)</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Set up GreenAPI and send track-management messages.
                            </Typography>
                        </Box>
                        <Button component={Link} to="/whatsapp" variant="outlined">
                            Open
                        </Button>
                    </Box>
                </Card>

                <Card sx={{ paddingX: 2, mt: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                        <Typography fontSize="large" sx={{ mt: 2 }}>
                            Deployments & Repository
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => setExpandedDeploy(!expandedDeploy)}
                            sx={{
                                transform: expandedDeploy ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: '0.3s',
                            }}>
                            <ExpandMoreIcon />
                        </IconButton>
                    </Box>
                    <Collapse in={expandedDeploy}>
                        <WebhooksFields control={control} isSubmitting={formState.isSubmitting} event={event} />

                        <Typography fontWeight="600" mt={4}>
                            Repository Settings
                        </Typography>
                        <RepoFields control={control} isSubmitting={formState.isSubmitting} event={event} />

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
                    </Collapse>
                </Card>
                <SaveShortcut />
            </FormContainer>
        </Container>
    )
}
