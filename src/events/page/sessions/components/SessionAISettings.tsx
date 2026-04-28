import { FormContainer, SelectElement, TextFieldElement, useForm } from 'react-hook-form-mui'
import { Box, Button, Grid, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { SaveShortcut } from '../../../../components/form/SaveShortcut'
import React, { useEffect, useRef } from 'react'
import { useFirestoreDocumentMutation } from '../../../../services/hooks/firestoreMutationHooks'
import { doc } from 'firebase/firestore'
import { collections } from '../../../../services/firebase'
import { Event, EventAISettings } from '../../../../types'
import { GenerateSessionsTeasingContentPrompts, BaseAiSettings } from '../../../actions/sessions/generation/generateSessionTeasingContent'
import { BASE_OPENROUTER_SETTINGS, useAiModelList } from '../../../../services/openRouter'

export const SessionAISettings = ({
    event,
    onValuesChange,
}: {
    event: Event
    onValuesChange?: (values: EventAISettings) => void
}) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))

    const formContext = useForm({
        defaultValues: {
            teasingPromptSystem:
                event.aiSettings?.sessions.teasingPromptSystem || GenerateSessionsTeasingContentPrompts.fr.system,
            teasingPromptUser:
                event.aiSettings?.sessions.teasingPromptUser || GenerateSessionsTeasingContentPrompts.fr.user,
            model: event.aiSettings?.model || BASE_OPENROUTER_SETTINGS.model,
            temperature: event.aiSettings?.temperature || BASE_OPENROUTER_SETTINGS.temperature,
        },
    })
    const modelList = useAiModelList(event.openRouterAPIKey || '')
    const { formState } = formContext

    // Forward unsaved form values upward so callers (e.g. the teasing dialog's
    // "Generate preview") can run a generation against what's currently in the
    // inputs without forcing the user to Save first.
    const onValuesChangeRef = useRef(onValuesChange)
    onValuesChangeRef.current = onValuesChange
    useEffect(() => {
        if (!onValuesChangeRef.current) return
        // Empty/cleared inputs fall back to the persisted (or hard-coded
        // default) settings so a half-edited form can't ship `temperature: ''`
        // (which downstream parses to `NaN`) or an empty model id.
        const fallback = event.aiSettings ?? BaseAiSettings
        const toSettings = (v: {
            teasingPromptSystem?: string
            teasingPromptUser?: string
            model?: string
            temperature?: string | number
        }): EventAISettings => {
            const tempIsEmpty = v.temperature === undefined || v.temperature === null || v.temperature === ''
            return {
                model: v.model || fallback.model,
                temperature: tempIsEmpty ? fallback.temperature : `${v.temperature}`,
                sessions: {
                    teasingPromptSystem: v.teasingPromptSystem || fallback.sessions.teasingPromptSystem,
                    teasingPromptUser: v.teasingPromptUser || fallback.sessions.teasingPromptUser,
                },
            }
        }
        // Seed parent with the current values, then keep it in sync.
        onValuesChangeRef.current(toSettings(formContext.getValues()))
        const subscription = formContext.watch((value) => {
            if (!onValuesChangeRef.current) return
            onValuesChangeRef.current(toSettings(value))
        })
        return () => subscription.unsubscribe()
    }, [formContext, event.aiSettings])

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
                            helperText="See model list at https://openrouter.ai/models"
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
                                    model: BASE_OPENROUTER_SETTINGS.model,
                                    temperature: BASE_OPENROUTER_SETTINGS.temperature,
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
