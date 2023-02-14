import * as React from 'react'
import { Avatar, Box, Button, Container, Grid, Link, Typography } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { FormContainer, TextFieldElement } from 'react-hook-form-mui'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { login, selectAuthCCError } from './authReducer'
import { useAppDispatch } from '../reduxStore'
import { useSelector } from 'react-redux'

const schema = yup
    .object({
        email: yup.string().email().required(),
        password: yup.string().min(5).max(255).trim().required(),
    })
    .required()

export const SignupScreen = ({}) => {
    const dispatch = useAppDispatch()
    const error = useSelector(selectAuthCCError)

    if (error?.error === 'auth/user-not-found') {
    }

    return (
        <Container component="main" maxWidth="xs">
            <FormContainer
                defaultValues={{ email: 'hugo.gresse@gmail.com', password: 'azerty' }}
                resolver={yupResolver(schema)}
                onSuccess={async (data) => {
                    console.log(data)
                    dispatch(login({ email: data.email, password: data.password }))
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
                        Sign up!
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
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                        Sign In
                    </Button>

                    {error && error?.error === 'auth/user-not-found' && (
                        <Box display="flex" flexDirection="column" mb={2} color="red">
                            <Typography>No user found matching this email, try to signup before?</Typography>
                            <Button href="/signup" title="Sign up" variant="outlined" color="secondary">
                                Sign up now
                            </Button>
                        </Box>
                    )}

                    <Grid container>
                        <Grid item xs>
                            <Link href="#" variant="body2">
                                Forgot password?
                            </Link>
                        </Grid>
                        <Grid item>
                            <Link href="#" variant="body2">
                                {"Don't have an account? Sign Up"}
                            </Link>
                        </Grid>
                    </Grid>
                </Box>
            </FormContainer>
        </Container>
    )
}
