import * as React from 'react'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Route, Switch } from 'wouter'
import { RequireLogin } from './auth/RequireLogin'
import { Provider } from 'react-redux'
import { reduxStore } from './reduxStore'
import { EventsScreen } from './events/EventsScreen'
import { LinkBehavior } from './components/CCLink'
import { LinkProps } from '@mui/material/Link'
import { QueryClient, QueryClientProvider } from 'react-query'

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
    },
})

const queryClient = new QueryClient()

export const App = ({}) => {
    return (
        <Provider store={reduxStore}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider theme={theme}>
                    <CssBaseline enableColorScheme />

                    <RequireLogin>
                        <Switch>
                            <Route path="/">
                                <EventsScreen />
                            </Route>
                            <Route>404, Not Found!</Route>
                        </Switch>
                    </RequireLogin>
                </ThemeProvider>
            </QueryClientProvider>
        </Provider>
    )
}
