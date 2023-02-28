import * as React from 'react'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import { Route, Switch } from 'wouter'
import { RequireLogin } from './auth/RequireLogin'
import { Provider } from 'react-redux'
import { reduxStore } from './reduxStore'
import { EventsScreen } from './events/EventsScreen'
import { LinkBehavior } from './components/CCLink'
import { LinkProps } from '@mui/material/Link'

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

export const App = ({}) => {
    return (
        <Provider store={reduxStore}>
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
        </Provider>
    )
}
