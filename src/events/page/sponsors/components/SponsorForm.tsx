import * as React from 'react'
import { Event, Sponsor } from '../../../../types'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import { Grid } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { ImageTextFieldElement } from '../../../../components/form/ImageTextFieldElement'

export type SponsorFormProps = {
    event: Event
    sponsor?: Sponsor
    onSubmit: (sponsor: Sponsor) => void
}
export const SponsorForm = ({ event, sponsor, onSubmit }: SponsorFormProps) => {
    const formContext = useForm({
        defaultValues: sponsor
            ? sponsor
            : {
                  name: '',
                  logoUrl: '',
                  website: undefined,
              },
    })
    const { formState } = formContext

    const isSubmitting = formState.isSubmitting

    return (
        <FormContainer
            formContext={formContext}
            onSuccess={async (data) => {
                return onSubmit({
                    id: sponsor?.id || '',
                    name: data.name,
                    logoUrl: data.logoUrl,
                    website: data.website || null,
                } as Sponsor)
            }}>
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    <TextFieldElement
                        margin="dense"
                        required={!!sponsor}
                        fullWidth
                        label="ID"
                        name="id"
                        variant="filled"
                        disabled={true}
                        size="small"
                    />

                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        required={true}
                        label="Name"
                        name="name"
                        variant="filled"
                        disabled={isSubmitting}
                    />

                    <ImageTextFieldElement
                        event={event}
                        margin="dense"
                        fullWidth
                        required={true}
                        label="Logo Url"
                        name="logoUrl"
                        variant="filled"
                        disabled={isSubmitting}
                    />

                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        label="Website"
                        name="website"
                        variant="filled"
                        disabled={isSubmitting}
                        type="url"
                    />
                </Grid>
            </Grid>

            <Grid item xs={12}>
                <LoadingButton
                    type="submit"
                    disabled={formState.isSubmitting}
                    loading={formState.isSubmitting}
                    fullWidth
                    variant="contained"
                    sx={{ mt: 2, mb: 2 }}>
                    {sponsor ? 'Save' : 'Add sponsor'}
                </LoadingButton>
            </Grid>
        </FormContainer>
    )
}
