import * as React from 'react'
import { Event, TeamMember } from '../../../../types'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import { Grid } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { ImageTextFieldElement } from '../../../../components/form/ImageTextFieldElement'
import { SaveShortcut } from '../../../../components/form/SaveShortcut'

export type MemberFormProps = {
    event: Event
    member?: TeamMember
    onSubmit: (member: TeamMember) => void
}
export const MemberForm = ({ event, member, onSubmit }: MemberFormProps) => {
    const formContext = useForm({
        defaultValues: member
            ? member
            : {
                  name: '',
                  photoUrl: '',
                  role: '',
              },
    })
    const { formState } = formContext
    const isSubmitting = formState.isSubmitting

    return (
        <FormContainer
            formContext={formContext}
            onSuccess={async (data) => {
                if (member) {
                    return onSubmit({
                        id: member?.id,
                        name: data.name,
                        role: data.role,
                        photoUrl: data.photoUrl,
                    } as TeamMember)
                }
                return onSubmit({
                    name: data.name,
                    role: data.role,
                    photoUrl: data.photoUrl,
                } as TeamMember)
            }}>
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    <TextFieldElement
                        margin="dense"
                        required={!!member}
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
                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        required={false}
                        label="Role"
                        name="role"
                        variant="filled"
                        disabled={isSubmitting}
                    />

                    <ImageTextFieldElement
                        event={event}
                        margin="dense"
                        fullWidth
                        required={false}
                        label="Photo URL"
                        name="photoUrl"
                        variant="filled"
                        disabled={isSubmitting}
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
                    {member ? 'Save' : 'Add member'}
                </LoadingButton>
            </Grid>

            <SaveShortcut />
        </FormContainer>
    )
}
