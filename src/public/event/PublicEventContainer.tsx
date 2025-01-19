import { Box, createTheme, ThemeProvider, useMediaQuery } from '@mui/material'
import { usePublicEvent } from '../hooks/usePublicEvent'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { useMemo } from 'react'
import { Route, Switch, useRoute } from 'wouter'
import { PublicEventLayout } from '../PublicEventLayout'
import { PublicEvent } from './PublicEvent'
import PublicTalkDetail from './components/talk/PublicTalkDetail'

type PublicEventContainerProps = {
    eventId: string
}

export const PublicEventContainer = ({ eventId }: PublicEventContainerProps) => {
    const event = usePublicEvent(eventId)
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
    const [_, params] = useRoute('/talk/:talkId')
    const talkId = params?.talkId

    const theme = useMemo(() => {
        if (!event.data) return createTheme({ palette: { mode: prefersDarkMode ? 'dark' : 'light' } })

        return createTheme({
            palette: {
                mode: prefersDarkMode ? 'dark' : 'light',
                primary: {
                    main: event.data.event.color || '#00B19D',
                },
                secondary: {
                    main: event.data.event.colorSecondary || '#F8B904',
                },
                background: {
                    default: event.data.event.colorBackground || (prefersDarkMode ? '#121212' : '#ffffff'),
                },
                divider: prefersDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
            },
        })
    }, [event.data, prefersDarkMode])

    if (event.isLoading || !event.data) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <FirestoreQueryLoaderAndErrorDisplay hookResult={event} />
            </Box>
        )
    }

    const session = talkId ? event.data.sessions.find((s) => s.id === talkId) : null
    const sessionWithSpeakers = session
        ? {
              ...session,
              speakersData: event.data.speakers.filter((speaker) => session.speakerIds.includes(speaker.id)),
          }
        : null

    return (
        <ThemeProvider theme={theme}>
            <PublicEventLayout>
                <Switch>
                    <Route path="/talk/:talkId">
                        {sessionWithSpeakers && (
                            <PublicTalkDetail
                                session={sessionWithSpeakers}
                                categories={event.data.event.categories}
                                tracks={event.data.event.tracks}
                            />
                        )}
                    </Route>
                    <Route>
                        <PublicEvent eventId={eventId} event={event.data} />
                    </Route>
                </Switch>
            </PublicEventLayout>
        </ThemeProvider>
    )
}
