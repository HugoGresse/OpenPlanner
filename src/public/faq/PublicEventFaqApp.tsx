import { Route, Switch, useRoute } from 'wouter'
import { usePublicEventFaq } from '../hooks/usePublicEventFaq'
import { useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { PublicEventFaq } from './PublicEventFaq'
import * as React from 'react'

export type PublicEventFaqAppProps = {
    eventId: string
}
export const PublicEventFaqApp = ({ eventId }: PublicEventFaqAppProps) => {
    const [_, params] = useRoute('/:subRoute/:privateId*')

    const faq = usePublicEventFaq(eventId, params?.privateId)

    useEffect(() => {
        document.title = `FAQ | ${faq.data ? faq.data.eventName : ''}`
    }, [params])

    if (faq.isLoading || !faq.data) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <FirestoreQueryLoaderAndErrorDisplay hookResult={faq} />
            </Box>
        )
    }

    const faqData = faq.data

    return (
        <Switch>
            <Route path="/faq">
                <PublicEventFaq faqReply={faqData} />
            </Route>
            <Route path="/faq/:privateId">
                <PublicEventFaq faqReply={faqData} />
            </Route>

            <Route>
                <Typography variant="h1">Not implemented!</Typography>
            </Route>
        </Switch>
    )
}
