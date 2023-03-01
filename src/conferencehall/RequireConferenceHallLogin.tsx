import * as React from 'react'
import { Box, Button, ButtonProps, Typography } from '@mui/material'
import { conferenceHallLogin, ConferenceHallProviders, useConferenceHallUser } from './firebase/authConferenceHall'
import GoogleIcon from '@mui/icons-material/Google'
import TwitterIcon from '@mui/icons-material/Twitter'
import GitHubIcon from '@mui/icons-material/GitHub'
import styled from '@emotion/styled'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

const GoogleButton = styled(Button)<ButtonProps>(() => ({
    color: 'white',
    backgroundColor: '#ea2533',
    '&:hover': {
        backgroundColor: '#a31b25',
    },
}))
const TwitterButton = styled(Button)<ButtonProps>(() => ({
    color: 'white',
    backgroundColor: '#34ccfe',
    '&:hover': {
        backgroundColor: '#1a728f',
    },
}))
const GitHubButton = styled(Button)<ButtonProps>(() => ({
    color: 'white',
    backgroundColor: '#000000',
    '&:hover': {
        backgroundColor: '#3a3a3a',
    },
}))

export type RequireConferenceHallLoginProps = {
    children: (userId: string) => React.ReactNode
}
export const RequireConferenceHallLogin = (props: RequireConferenceHallLoginProps) => {
    const user = useConferenceHallUser()

    if (user) {
        return (
            <>
                <Typography variant="body1" sx={{ display: 'flex' }}>
                    <CheckCircleOutlineIcon color="success" /> You are logged in to Conference-Hall.io as{' '}
                    {user.displayName}
                </Typography>
                {props.children(user.uid)}
            </>
        )
    }

    return (
        <Box display="flex" gap={2} flexWrap="wrap">
            <GoogleButton
                size="large"
                onClick={() => {
                    conferenceHallLogin(ConferenceHallProviders.Google)
                }}>
                <GoogleIcon sx={{ marginRight: 1 }} />
                Google
            </GoogleButton>
            <TwitterButton
                size="large"
                onClick={() => {
                    conferenceHallLogin(ConferenceHallProviders.Twitter)
                }}>
                <TwitterIcon sx={{ marginRight: 1 }} />
                Twitter
            </TwitterButton>
            <GitHubButton
                size="large"
                onClick={() => {
                    conferenceHallLogin(ConferenceHallProviders.GitHub)
                }}>
                <GitHubIcon sx={{ marginRight: 1 }} />
                GitHub
            </GitHubButton>
        </Box>
    )
}
