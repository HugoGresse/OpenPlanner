import * as React from 'react'
import { Event, Sponsor } from '../../../../types'
import { FormContainer, TextFieldElement, SwitchElement, useForm } from 'react-hook-form-mui'
import { Grid, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { ImageTextFieldElement } from '../../../../components/form/ImageTextFieldElement'
import { SaveShortcut } from '../../../../components/form/SaveShortcut'

export type SponsorFormProps = {
    event: Event
    sponsor?: Sponsor
    onSubmit: (sponsor: Sponsor) => void
}
export const SponsorForm = ({ event, sponsor, onSubmit }: SponsorFormProps) => {
    const customFields = event.sponsorCustomFields || []

    const formContext = useForm({
        defaultValues: sponsor
            ? sponsor
            : {
                  name: '',
                  logoUrl: '',
                  website: undefined,
                  customFields: customFields.reduce(
                      (acc, field) => {
                          acc[field.id] = field.type === 'boolean' ? false : ''
                          return acc
                      },
                      {} as { [key: string]: string | boolean }
                  ),
              },
    })
    const { formState } = formContext

    const isSubmitting = formState.isSubmitting

    return (
        <FormContainer
            formContext={formContext}
            onSuccess={async (data) => {
                const customFieldValues: { [key: string]: string | boolean } = {}
                for (const field of customFields) {
                    const value = (data as any).customFields?.[field.id]
                    customFieldValues[field.id] = field.type === 'boolean' ? !!value : value || ''
                }

                return onSubmit({
                    ...sponsor,
                    id: sponsor?.id || '',
                    name: data.name,
                    logoUrl: data.logoUrl,
                    website: data.website || null,
                    customFields: customFieldValues,
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

                    {customFields.length > 0 && (
                        <>
                            <Typography fontWeight="600" mt={2} mb={1}>
                                Custom fields
                            </Typography>
                            {customFields.map((field) =>
                                field.type === 'boolean' ? (
                                    <SwitchElement
                                        key={field.id}
                                        label={field.name}
                                        name={`customFields.${field.id}`}
                                    />
                                ) : (
                                    <TextFieldElement
                                        key={field.id}
                                        margin="dense"
                                        fullWidth
                                        label={field.name}
                                        name={`customFields.${field.id}`}
                                        variant="filled"
                                        disabled={isSubmitting}
                                    />
                                )
                            )}
                        </>
                    )}
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
            <SaveShortcut />
        </FormContainer>
    )
}
