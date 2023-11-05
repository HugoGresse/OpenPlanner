import * as React from 'react'
import { useLocation } from 'wouter'
import { collections } from '../../../services/firebase'
import { Button, Card, Container, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { Event } from '../../../types'
import { MemberForm } from './components/MemberForm'
import { useFirestoreCollectionMutation } from '../../../services/hooks/firestoreMutationHooks'
import { slugify } from '../../../utils/slugify'

export type NewMemberProps = {
    event: Event
}
export const NewMember = ({ event }: NewMemberProps) => {
    const [_, setLocation] = useLocation()
    const mutation = useFirestoreCollectionMutation(collections.team(event.id))

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Button href="/team" startIcon={<ArrowBack />}>
                Cancel
            </Button>
            <Card sx={{ paddingX: 2 }}>
                <Typography variant="h2">New member</Typography>

                <MemberForm
                    event={event}
                    onSubmit={(member) => {
                        return mutation.mutate(member, slugify(member.name)).then(() => {
                            setLocation('/team')
                        })
                    }}
                />

                {mutation.isError && (
                    <Typography color="error">Error while adding member: {mutation.error?.message}</Typography>
                )}
            </Card>
        </Container>
    )
}
