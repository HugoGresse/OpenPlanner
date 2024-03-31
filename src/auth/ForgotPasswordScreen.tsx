import * as React from 'react'
import { Box, Container, Link, Typography, useMediaQuery } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { resetPassword } from './authReducer'
import { useAppDispatch } from '../reduxStore'
import { useNotification } from '../hooks/notificationHook'

const schema = yup
    .object({
        email: yup.string().email().required(),
    })
    .required()

export const ForgotPasswordScreen = ({}) => {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const dispatch = useAppDispatch()
    const { createNotification } = useNotification()
    const formContext = useForm({
        defaultValues: {
            email: '',
        },
    })
    const { formState } = formContext

    return (
        <>
            <Container component="main" maxWidth="md" sx={{ justifyContent: 'center', display: 'flex', marginTop: 4 }}>
                <img
                    src={`/logos/${prefersDarkMode ? 'open-planner-light.svg' : 'open-planner.svg'}`}
                    alt="OpenPlanner logo"
                    height="200px"
                />
            </Container>
            <Container component="main" maxWidth="xs">
                <FormContainer
                    formContext={formContext}
                    resolver={yupResolver(schema)}
                    onSuccess={async (data) => {
                        const sentResult = await dispatch(resetPassword({ email: data.email }))

                        // @ts-ignore
                        if (sentResult.payload?.error) {
                            // @ts-ignore
                            const errorDetail = `${sentResult.payload.error} - ${sentResult.payload.message}`
                            createNotification('Fail to send reset password link... ' + errorDetail, { type: 'error' })
                        } else {
                            createNotification('Password email sent!', { type: 'success' })
                        }
                    }}>
                    <Box
                        sx={{
                            marginTop: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                        <Link href="/" variant="body2">
                            Back to login
                        </Link>
                        <Typography component="h1" variant="h5">
                            Forgot Password
                        </Typography>
                        <TextFieldElement
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            disabled={formState.isSubmitting}
                            sx={{ mt: 6 }}
                        />
                        <LoadingButton
                            type="submit"
                            disabled={formState.isSubmitting}
                            loading={formState.isSubmitting}
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}>
                            Send reset link
                        </LoadingButton>
                    </Box>
                </FormContainer>
            </Container>
        </>
    )
}
