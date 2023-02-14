import * as React from 'react'
import { Avatar, Box, Container, Grid, Link, Typography } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LoadingButton from '@mui/lab/LoadingButton'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { login, register, selectAuthCCError } from './authReducer'
import { useAppDispatch } from '../reduxStore'
import { useSelector } from 'react-redux'

const schema = yup
    .object({
        email: yup.string().email().required(),
        password: yup.string().min(5).max(255).trim().required(),
    })
    .required()

export const LoginForm = ({}) => {
    const dispatch = useAppDispatch()
    const formContext = useForm({
        defaultValues: {
            email: 'hugo@example.com',
            password: 'azerty',
        },
    })
    const error = useSelector(selectAuthCCError)

    const { watch, formState } = formContext

    return (
        <Container component="main" maxWidth="xs">
            <FormContainer
                formContext={formContext}
                resolver={yupResolver(schema)}
                onSuccess={async (data) => {
                    await dispatch(login({ email: data.email, password: data.password }))
                }}>
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}>
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Sign in
                    </Typography>
                    <Typography component="p" variant="body1">
                        Use a single account per event or organization as ConferenceCenter don't have a role system yet.
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
                    <TextFieldElement
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        disabled={formState.isSubmitting}
                    />
                    <LoadingButton
                        type="submit"
                        disabled={formState.isSubmitting}
                        loading={formState.isSubmitting}
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}>
                        Sign In
                    </LoadingButton>

                    {error && error?.error === 'auth/user-not-found' && (
                        <Box display="flex" flexDirection="column" mb={2} color="red">
                            <Typography>
                                No user found matching this email, do you want to signup now using this email and
                                password?
                            </Typography>
                            <LoadingButton
                                title="Sign up"
                                disabled={formState.isSubmitting}
                                loading={formState.isSubmitting}
                                onClick={() => {
                                    const email = watch('email')
                                    const password = watch('password')
                                    dispatch(register({ email: email, password: password }))
                                }}
                                variant="outlined"
                                color="secondary">
                                Sign up now
                            </LoadingButton>
                        </Box>
                    )}
                    {error && error?.error !== 'auth/user-not-found' && (
                        <Box display="flex" flexDirection="column" mb={2} color="red">
                            <Typography>Error: error?.error, error?.message</Typography>
                        </Box>
                    )}

                    <Grid container>
                        <Grid item xs>
                            <Link href="#" variant="body2">
                                Forgot password? (not implemented, ask Hugo)
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </FormContainer>
        </Container>
    )
}
