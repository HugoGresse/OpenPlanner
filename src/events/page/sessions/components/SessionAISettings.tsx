import { FormContainer, SelectElement, TextFieldElement, useForm } from 'react-hook-form-mui'
import { Box, Button, Grid, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { SaveShortcut } from '../../../../components/form/SaveShortcut'
import React from 'react'
import { useFirestoreDocumentMutation } from '../../../../services/hooks/firestoreMutationHooks'
import { doc } from 'firebase/firestore'
import { collections } from '../../../../services/firebase'
import { Event, EventAISettings } from '../../../../types'
import { GenerateSessionsTeasingContentPrompts } from '../../../actions/sessions/generation/generateSessionTeasingContent'
import { BASE_OPENAI_SETTINGS, useAiModelList } from '../../../../services/openai'

export const SessionAISettings = ({ event }: { event: Event }) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))

    const formContext = useForm({
        defaultValues: {
            teasingPromptSystem:
                event.aiSettings?.sessions.teasingPromptSystem || GenerateSessionsTeasingContentPrompts.fr.system,
            teasingPromptUser:
                event.aiSettings?.sessions.teasingPromptUser || GenerateSessionsTeasingContentPrompts.fr.user,
            model: event.aiSettings?.model || BASE_OPENAI_SETTINGS.model,
            temperature: event.aiSettings?.temperature || BASE_OPENAI_SETTINGS.temperature,
        },
    })
    const modelList = useAiModelList(event.openAPIKey || '')
    const { formState } = formContext

    return (
        <Box padding={2} borderRadius={2} border={1} borderColor="#66666688" mt={2} mb={2}>
            <FormContainer
                formContext={formContext}
                onSuccess={async (data) => {
                    const settings: EventAISettings = {
                        ...event.aiSettings,
                        sessions: {
                            teasingPromptSystem: data.teasingPromptSystem,
                            teasingPromptUser: data.teasingPromptUser,
                        },
                        model: data.model,
                        temperature: `${data.temperature}`,
                    }
                    return mutation.mutate({
                        aiSettings: settings,
                    })
                }}>
                <Typography component="h6" variant="h6">
                    ShortVid settings
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextFieldElement
                            margin="dense"
                            required
                            fullWidth
                            multiline={true}
                            label="System prompt"
                            name="teasingPromptSystem"
                            variant="filled"
                            disabled={formState.isSubmitting}
                        />
                        <TextFieldElement
                            margin="dense"
                            required
                            fullWidth
                            multiline={true}
                            label="User prompt"
                            name="teasingPromptUser"
                            variant="filled"
                            disabled={formState.isSubmitting}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <SelectElement
                            margin="dense"
                            required
                            fullWidth
                            label="Model"
                            name="model"
                            helperText="See model list here: https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4"
                            variant="filled"
                            disabled={formState.isSubmitting}
                            options={modelList.map((m) => ({ id: m.id, label: m.id }))}
                        />
                        <TextFieldElement
                            margin="dense"
                            required
                            fullWidth
                            type="number"
                            InputProps={{ inputProps: { min: 0, max: 1, step: 0.1 } }}
                            label="Temperature"
                            helperText="from 0 to 1, lower temperature means more conservative predictions, it follows the prompt more closely, higher temperature means more creative predictions."
                            name="temperature"
                            variant="filled"
                            disabled={formState.isSubmitting}
                        />
                        <Button
                            variant="outlined"
                            onClick={() => {
                                formContext.reset({
                                    teasingPromptSystem: GenerateSessionsTeasingContentPrompts.fr.system,
                                    teasingPromptUser: GenerateSessionsTeasingContentPrompts.fr.user,
                                    model: BASE_OPENAI_SETTINGS.model,
                                    temperature: BASE_OPENAI_SETTINGS.temperature,
                                })
                            }}>
                            Reset to default
                        </Button>
                    </Grid>
                    <Grid item xs={12}>
                        <LoadingButton
                            type="submit"
                            disabled={formState.isSubmitting}
                            loading={formState.isSubmitting}
                            variant="contained">
                            Save
                        </LoadingButton>
                        {mutation.error && <Typography color="error">{mutation.error.message}</Typography>}
                    </Grid>
                </Grid>
                <SaveShortcut />
            </FormContainer>
        </Box>
    )
}
