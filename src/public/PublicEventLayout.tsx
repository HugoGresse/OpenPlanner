import * as React from 'react'
import { Box, Container, Typography, useTheme } from '@mui/material'
import { useSearchParams } from 'wouter'

export type PublicEventLayoutProps = {
    children: React.ReactNode
}

const PoweredBy = () => {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'

    const linkStyle = {
        color: isDarkMode ? '#aaaaaa' : '#555555',
    }
    return (
        <Box display="flex" justifyContent="flex-end">
            <Box padding={1} bgcolor="#88888855" borderRadius={2} color="#888888">
                Powered by{' '}
                <Typography
                    component="a"
                    href="https://github.com/HugoGresse/OpenPlanner"
                    sx={linkStyle}
                    target="_blank">
                    OpenPlanner
                </Typography>{' '}
                ·{' '}
                <Typography component="a" href="https://github.com/sponsors/HugoGresse" sx={linkStyle} target="_blank">
                    Donate
                </Typography>
            </Box>
        </Box>
    )
}

export const PublicEventLayout = (props: PublicEventLayoutProps) => {
    const [searchParams] = useSearchParams()
    const hideHeader = searchParams.get('hideHeader') === 'true'

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {!hideHeader && <PoweredBy />}
            {props.children}
        </Container>
    )
}
