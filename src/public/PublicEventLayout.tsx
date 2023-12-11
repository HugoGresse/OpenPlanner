import * as React from 'react'
import { Box, Container, Typography, useTheme } from '@mui/material'

export type PublicEventLayoutProps = {
    children: React.ReactNode
}
export const PublicEventLayout = (props: PublicEventLayoutProps) => {
    const theme = useTheme()
    const isDarkMode = theme.palette.mode === 'dark'

    const linkStyle = {
        color: isDarkMode ? '#aaaaaa' : '#555555',
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
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
                    <Typography
                        component="a"
                        href="https://github.com/sponsors/HugoGresse"
                        sx={linkStyle}
                        target="_blank">
                        Donate
                    </Typography>
                </Box>
            </Box>

            {props.children}
        </Container>
    )
}
