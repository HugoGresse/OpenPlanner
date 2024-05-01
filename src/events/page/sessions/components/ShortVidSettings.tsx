import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import { Box, Button, Grid, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { SaveShortcut } from '../../../../components/form/SaveShortcut'
import React, { useState } from 'react'
import { useFirestoreDocumentMutation } from '../../../../services/hooks/firestoreMutationHooks'
import { doc } from 'firebase/firestore'
import { collections } from '../../../../services/firebase'
import { Event, EventShortVidSettings } from '../../../../types'
import { ExpandMore } from '@mui/icons-material'

export const ShortVidSettings = ({ event }: { event: Event }) => {
    const mutation = useFirestoreDocumentMutation(doc(collections.events, event.id))
    const [formatOpen, setFormatOpen] = useState(false)

    const formContext = useForm({
        defaultValues: {
            template: event.shortVidSettings?.template || 'TalkBranded',
        },
    })
    const { formState } = formContext

    return (
        <Box padding={2} borderRadius={2} border={1} borderColor="#66666688" mt={2} mb={2}>
            <FormContainer
                formContext={formContext}
                onSuccess={async (data) => {
                    const shortVidSettings: EventShortVidSettings = {
                        template: data.template,
                    }
                    return mutation.mutate({
                        shortVidSettings: shortVidSettings,
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
                            id="template"
                            label="Template name (exemple: TalkBranded or Devoxx2024)"
                            name="template"
                            variant="filled"
                            disabled={formState.isSubmitting}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Button endIcon={<ExpandMore />} onClick={() => setFormatOpen(!formatOpen)}>
                            Expected format
                        </Button>
                        {formatOpen && (
                            <pre>
                                {` # for each session (already compatible with TalkBranded)
title: string
location: string | null
startingDate: string
logoUrl: string
backgroundColor: string
speakers?: {
    pictureUrl: string
    name: string
    company: string
    job: string | null
}[] `}
                            </pre>
                        )}
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
