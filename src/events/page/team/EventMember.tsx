import * as React from 'react'
import { Box, Button, Card, Container, Link, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useLocation, useRoute } from 'wouter'
import { doc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { MemberForm } from './components/MemberForm'
import { useFirestoreDocumentMutation } from '../../../services/hooks/firestoreMutationHooks'
import { useTeam } from '../../../services/hooks/useTeam'
import { Event, TeamMember } from '../../../types'

export type EventMemberProps = {
    event: Event
}
export const EventMember = ({ event }: EventMemberProps) => {
    const [_, params] = useRoute('/:routeName/:memberId/*?')
    const members = useTeam(event.id)
    const [_2, setLocation] = useLocation()

    const memberId = params?.memberId

    const mutation = useFirestoreDocumentMutation(doc(collections.team(event.id), memberId))

    if (members.isLoading || !members.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={members} />
    }

    const member = members.data.find((s: TeamMember) => s.id === memberId)

    if (!member) {
        setLocation('/team')
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} key={memberId}>
            <Box display="flex" justifyContent="space-between" mt={2}>
                <Button startIcon={<ArrowBack />} component={Link} href="/team">
                    All members
                </Button>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                <Typography variant="h2">{member.name}</Typography>

                <MemberForm
                    event={event}
                    member={member}
                    onSubmit={async (data) => {
                        await mutation.mutate(data)
                    }}
                />
            </Card>
        </Container>
    )
}
