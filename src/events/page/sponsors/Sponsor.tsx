import * as React from 'react'
import { Event, Sponsor as SponsorType, SponsorCategory } from '../../../types'
import { Box, Button, Card, Container, Link, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useLocation, useRoute } from 'wouter'
import { useFirestoreDocumentMutation } from '@react-query-firebase/firestore'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { useSponsors } from '../../../services/hooks/useSponsors'
import { getQueryParams } from '../../../utils/getQuerySearchParameters'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { SponsorForm } from './components/SponsorForm'

export type SponsorProps = {
    event: Event
}
export const Sponsor = ({ event }: SponsorProps) => {
    const [_, params] = useRoute('/:routeName/:sponsorId*')
    const sponsors = useSponsors(event.id)
    const [_2, setLocation] = useLocation()

    const sponsorId = params?.sponsorId
    const categoryId = getQueryParams().categoryId

    const mutation = useFirestoreDocumentMutation(doc(collections.sponsors(event.id), categoryId), {
        merge: true,
    })

    if (sponsors.isLoading || !sponsors.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sponsors} />
    }

    const allSponsor = sponsors.data.find((c: SponsorCategory) => c.id === categoryId).sponsors
    const sponsor = allSponsor.find((s: SponsorType) => s.id === sponsorId)

    if (!sponsor) {
        setLocation('/sponsors')
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} key={sponsorId}>
            <Box display="flex" justifyContent="space-between" mt={2}>
                <Button startIcon={<ArrowBack />} component={Link} href="/sponsors">
                    All sponsors
                </Button>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                <Typography variant="h2">{sponsor.name}</Typography>

                <SponsorForm
                    event={event}
                    sponsor={sponsor}
                    onSubmit={async (data) => {
                        await mutation.mutateAsync({
                            sponsors: allSponsor.map((s: SponsorType) => {
                                if (s.id === sponsorId) {
                                    return data
                                }
                                return s
                            }),
                        } as unknown as SponsorCategory)
                    }}
                />
            </Card>
        </Container>
    )
}
