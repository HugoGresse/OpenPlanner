import { Event, TeamMember } from '../../../../types'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import { Grid } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { ImageTextFieldElement } from '../../../../components/form/ImageTextFieldElement'
import { SaveShortcut } from '../../../../components/form/SaveShortcut'
import { TeamSocialFields } from './TeamSocialFields'
import { useTeamByTeams } from '../../../../services/hooks/useTeam'
import { useMemo } from 'react'
import { OPAutocomplete } from '../../../../components/form/OPAutocomplete'

export type MemberFormProps = {
    event: Event
    member?: TeamMember
    onSubmit: (member: TeamMember) => void
}
export const MemberForm = ({ event, member, onSubmit }: MemberFormProps) => {
    const teams = useTeamByTeams([event.id])
    const teamOptions = useMemo(() => {
        if (!teams.data) return []
        return Object.keys(teams.data).map((team) => ({ id: team, label: team }))
    }, [teams.data])

    const formContext = useForm({
        defaultValues: member
            ? member
            : {
                  name: '',
                  bio: '',
                  photoUrl: '',
                  role: '',
                  team: '',
                  socials: [],
              },
    })
    const { formState, control } = formContext
    const isSubmitting = formState.isSubmitting

    return (
        <FormContainer
            formContext={formContext}
            onSuccess={async (data) => {
                const socials = (data.socials || []).filter((social) => social.link && social.link.length)
                const newData = {
                    name: data.name,
                    bio: data.bio || '',
                    role: data.role || '',
                    team: (data.team as unknown as { label: string })?.label || data.team || 'default',
                    photoUrl: data.photoUrl,
                    socials,
                }

                if (member) {
                    return onSubmit({
                        id: member?.id,
                        ...newData,
                    } as TeamMember)
                }
                return onSubmit(newData as TeamMember)
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

                    <OPAutocomplete
                        name="team"
                        label="Team"
                        options={teamOptions}
                        loading={teams.isLoading}
                        freeSolo={true}
                        textFieldProps={{
                            margin: 'dense',
                            variant: 'filled',
                            disabled: isSubmitting,
                        }}
                    />

                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={40}
                        label="Bio"
                        name="bio"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
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
                <Grid item xs={12} md={6}>
                    <TeamSocialFields control={control} isSubmitting={isSubmitting} />
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
