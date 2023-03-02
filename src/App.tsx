import * as React from 'react'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Route, Router, Switch } from 'wouter'
import { RequireLogin } from './auth/RequireLogin'
import { Provider } from 'react-redux'
import { reduxStore } from './reduxStore'
import { EventsScreen } from './events/list/EventsScreen'
import { LinkBehavior } from './components/CCLink'
import { LinkProps } from '@mui/material/Link'
import { QueryClient, QueryClientProvider } from 'react-query'
import { EventRouter } from './events/page/EventRouter'

const theme = createTheme({
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
})

const queryClient = new QueryClient()

export const App = ({}) => {
    return (
        <Router>
            <Provider store={reduxStore}>
                <QueryClientProvider client={queryClient}>
                    <ThemeProvider theme={theme}>
                        <CssBaseline enableColorScheme />

                        <RequireLogin>
                            <Switch>
                                <Route path="/">
                                    <EventsScreen />
                                </Route>
                                <EventRouter />
                                <Route>404, Not Found!</Route>
                            </Switch>
                        </RequireLogin>
                    </ThemeProvider>
                </QueryClientProvider>
            </Provider>
        </Router>
    )
}
