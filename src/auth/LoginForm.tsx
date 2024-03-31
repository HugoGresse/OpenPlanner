import * as React from 'react'
import { Box, Container, Grid, Link, Typography, useMediaQuery } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { FormContainer, TextFieldElement, useForm } from 'react-hook-form-mui'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { login, register, selectAuthOpenPlannerError } from './authReducer'
import { useAppDispatch } from '../reduxStore'
import { useSelector } from 'react-redux'

const schema = yup
    .object({
        email: yup.string().email().required(),
        password: yup.string().min(5).max(255).trim().required(),
    })
    .required()

export const LoginForm = ({}) => {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const dispatch = useAppDispatch()
    const formContext = useForm({
        defaultValues: {
            email: '',
            password: '',
        },
    })
    const error = useSelector(selectAuthOpenPlannerError)

    const { watch, formState } = formContext

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
                        await dispatch(login({ email: data.email, password: data.password }))
                    }}>
                    <Box
                        sx={{
                            marginTop: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                        <Typography component="h1" variant="h5">
                            Sign in
                        </Typography>
                        <Typography component="p" variant="body1">
                            Use a single account per event or organization as OpenPlanner don't have a role system yet.
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
                            Sign In (or sign up)
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
                                <Typography>{`Error: ${error?.error}, ${error?.message}`}</Typography>
                            </Box>
                        )}

                        <Grid container>
                            <Grid item xs>
                                <Link href="/auth/reset" variant="body2">
                                    Forgot password?
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>
                </FormContainer>
            </Container>
        </>
    )
}
