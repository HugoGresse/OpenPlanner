import { Typography } from '@mui/material'
import { Control, TextFieldElement } from 'react-hook-form-mui'
import { Event, EventSettingForForm } from '../../../../types'

export type RepoFieldsProps = {
    control: Control<EventSettingForForm, any>
    isSubmitting: boolean
    event: Event
}

export const RepoFields = ({ control, isSubmitting, event }: RepoFieldsProps) => {
    return (
        <>
            <Typography variant="body2">for CI progress monitoring, only GitHub is supported.</Typography>

            <TextFieldElement
                label="Repository URL"
                name="repoUrl"
                control={control}
                variant="filled"
                size="small"
                margin="dense"
                fullWidth
                disabled={isSubmitting}
                type="url"
                helperText="GitHub repository URL (e.g., https://github.com/owner/repo)"
            />

            <TextFieldElement
                label="GitHub Token (optional)"
                name="repoToken"
                control={control}
                variant="filled"
                size="small"
                margin="dense"
                type="password"
                fullWidth
                disabled={isSubmitting}
                helperText="GitHub personal access token for API access, recommended to prevent rate limiting. Generate a token at https://github.com/settings/personal-access-tokens with actions read permission"
            />
        </>
    )
}
