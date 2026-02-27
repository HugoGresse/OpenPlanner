import * as yup from 'yup'
import { Event, EventSettingForForm } from '../../../types'
import { useEffect, useState } from 'react'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { FormContainer, useForm, SwitchElement } from 'react-hook-form-mui'
import { Card, Container, Grid, Typography, Box, Button, IconButton, Collapse } from '@mui/material'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { yupResolver } from '@hookform/resolvers/yup'
import { mapEventDevSettingsFormToMutateObject } from '../settings/mapEventSettingsFormToMutateObject'
import { WebhooksFields } from '../settings/components/WebhooksFields'
import { RepoFields } from '../settings/components/RepoFields'
import { EventStaticApiFilePaths } from '../settings/components/EventStaticApiFilePaths'
import LoadingButton from '@mui/lab/LoadingButton'
import { SaveShortcut } from '../../../components/form/SaveShortcut'
import { TextFieldElementWithGenerateApiKeyButton } from '../../../components/form/TextFieldElementWithGenerateApiKeyButton'
import { getFaqBaseLinkLink } from '../faq/faqLink'
import { useFaqs } from '../../../services/hooks/useFaqs'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { TypographyCopyable } from '../../../components/TypographyCopyable'
import { Link } from 'wouter'
import { TextFieldElementPrivate } from '../../../components/form/TextFieldElementPrivate'
import { PdfScheduleSection } from '../../../components/PdfScheduleSection'

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
    const faqQuery = useFaqs(event)
    const [expandedAPI, setExpandedAPI] = useState(true)
    const [expandedWebsite, setExpandedWebsite] = useState(true)
    const [expandedFAQ, setExpandedFAQ] = useState(true)
    const [expandedDeploy, setExpandedDeploy] = useState(true)

    const formContext = useForm({
        defaultValues: convertInputEvent(event),
    })
    const { control, formState, reset, watch } = formContext
    const publicEnabled = watch('publicEnabled')

    useEffect(() => {
        reset(convertInputEvent(event))
    }, [event])

    const eventPublicUrl = `${window.location.protocol}//${window.location.host}/public/event/${event.id}`
    const faqBaseUrl = getFaqBaseLinkLink(event)

    if (faqQuery.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={faqQuery} />
    }

    const faqCategories = faqQuery.data || []
    const privateFaqCount = faqCategories.filter((f) => f.private).length || 0

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
                    API & Deploys
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                        <Typography fontSize="large" sx={{ mt: 2 }}>
                            Website
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => setExpandedWebsite(!expandedWebsite)}
                            sx={{
                                transform: expandedWebsite ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: '0.3s',
                            }}>
                            <ExpandMoreIcon />
                        </IconButton>
                    </Box>
                    <Collapse in={expandedWebsite}>
                        <Box mb={2}>
                            <SwitchElement label="Enable public website" name="publicEnabled" />
                            {publicEnabled && (
                                <Box mt={1}>
                                    <TypographyCopyable>{eventPublicUrl}</TypographyCopyable>
                                </Box>
                            )}
                        </Box>

                        <PdfScheduleSection event={event} />
                    </Collapse>
                </Card>

                <Card sx={{ paddingX: 2, mt: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                        <Typography fontSize="large" sx={{ mt: 2 }}>
                            FAQ
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={() => setExpandedFAQ(!expandedFAQ)}
                            sx={{
                                transform: expandedFAQ ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: '0.3s',
                            }}>
                            <ExpandMoreIcon />
                        </IconButton>
                    </Box>
                    <Collapse in={expandedFAQ}>
                        <Box>
                            <Typography variant="body1" gutterBottom>
                                Public FAQ:{' '}
                                <Button component={Link} to={`/faq`}>
                                    Edit FAQ
                                </Button>
                            </Typography>
                            <TypographyCopyable>{faqBaseUrl}</TypographyCopyable>

                            <Typography variant="body1" mt={2} gutterBottom>
                                Private FAQ pages: {privateFaqCount}
                            </Typography>

                            {faqCategories.map(
                                (category) =>
                                    category.private && (
                                        <Box key={category.id}>
                                            <Typography variant="subtitle1" gutterBottom>
                                                {category.name}
                                            </Typography>
                                            <TypographyCopyable singleLine={true}>
                                                {`${faqBaseUrl}${category.privateId}`}
                                            </TypographyCopyable>
                                        </Box>
                                    )
                            )}
                        </Box>
                    </Collapse>
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
