import * as React from 'react'
import { lazy, Suspense } from 'react'
import { Box, createTheme, CssBaseline, Typography, ThemeProvider, useMediaQuery } from '@mui/material'
import { Link, Redirect, Route, Router, Switch } from 'wouter'
import { RequireLogin } from './auth/RequireLogin'
import { Provider } from 'react-redux'
import { reduxStore } from './reduxStore'
import { LinkBehavior } from './components/CCLink'
import { LinkProps } from '@mui/material/Link'
import { EventRouter } from './events/page/EventRouter'
import { NotificationProvider } from './context/SnackBarProvider'
import { SuspenseLoader } from './components/SuspenseLoader'
import { PublicApp } from './public/PublicApp'
import { ForgotPasswordScreen } from './auth/ForgotPasswordScreen'
import { AdminScreen } from './events/admin/AdminScreen'
import { EventApp } from './events/page/EventApp'

const EventsScreen = lazy(() =>
    import('./events/list/EventsScreen').then((module) => ({ default: module.EventsScreen }))
)

export const App = ({}) => {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

    const theme = React.useMemo(
        () =>
            createTheme({
                palette: {
                    mode: prefersDarkMode ? 'dark' : 'light',
                    primary: {
                        main: '#00B19D',
                    },
                    secondary: {
                        main: '#F8B904',
                    },
                    divider: prefersDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                },
                components: {
                    MuiLink: {
                        defaultProps: {
                            component: LinkBehavior,
                        } as LinkProps,
                    },
                    MuiButtonBase: {
                        defaultProps: {
                            LinkComponent: LinkBehavior,
                        },
                    },
                    MuiListItemButton: {
                        // not working as of March 2023: https://github.com/mui/material-ui/pull/34159
                        defaultProps: {
                            LinkComponent: LinkBehavior,
                        },
                    },
                },
            }),
        [prefersDarkMode]
    )

    return (
        <Provider store={reduxStore}>
            <ThemeProvider theme={theme}>
                <CssBaseline enableColorScheme />
                <NotificationProvider>
                    <Switch>
                        <Route path="/public/event/:eventId/*?">
                            <PublicApp />
                        </Route>
                        <Route path="/auth/reset">
                            <ForgotPasswordScreen />
                        </Route>
                        <RequireLogin>
                            <Switch>
                                <Route path="/">
                                    <Suspense fallback={<SuspenseLoader />}>
                                        <EventsScreen />
                                    </Suspense>
                                </Route>
                                <Route path="/admins">
                                    <Suspense fallback={<SuspenseLoader />}>
                                        <AdminScreen />
                                    </Suspense>
                                </Route>
                                <Route path="/events/">
                                    <Redirect to="/" />
                                </Route>
                                <Route path="/events/:eventId/*?">
                                    <EventRouter />
                                </Route>
                                <Route>
                                    <Box sx={{ display: 'flex', p: 5, flexDirection: 'column', alignItems: 'center' }}>
                                        <Typography>404, Not Found!</Typography>
                                        <Link href="/">Go to home</Link>
                                    </Box>
                                </Route>
                            </Switch>
                        </RequireLogin>
                    </Switch>
                </NotificationProvider>
            </ThemeProvider>
        </Provider>
    )
}
