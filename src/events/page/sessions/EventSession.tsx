import { useCallback, useState } from 'react'
import { Event, Speaker } from '../../../types'
import { Box, Button, Card, Container, Typography } from '@mui/material'
import { useSession } from '../../../services/hooks/useSession'
import { useLocation, useRoute } from 'wouter'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ArrowBack } from '@mui/icons-material'
import { EventSessionForm } from './EventSessionForm'
import { deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { DeleteSessionDialog } from './DeleteSessionDialog'
import { DeleteOrphanedSpeakersDialog } from './DeleteOrphanedSpeakersDialog'

export type EventSessionProps = {
    event: Event
}
export const EventSession = ({ event }: EventSessionProps) => {
    const [_, params] = useRoute('/:routeName/:sessionId/*?')
    const [_2, setLocation] = useLocation()

    const sessionId = params?.sessionId || ''
    const sessionResult = useSession(event.id, sessionId)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [orphanedSpeakers, setOrphanedSpeakers] = useState<Speaker[]>([])
    const [orphanDeleteOpen, setOrphanDeleteOpen] = useState(false)
    const [orphanDeleting, setOrphanDeleting] = useState(false)
    const documentDeletion = useFirestoreDocumentDeletion(doc(collections.sessions(event.id), sessionId))
    const mutation = useFirestoreDocumentMutation(doc(collections.sessions(event.id), sessionId))

    const findOrphanedSpeakers = useCallback(
        async (speakerIds: string[]) => {
            const orphaned: Speaker[] = []
            const speakersData = sessionResult.data?.speakersData
            for (const speakerId of speakerIds) {
                const sessionsQuery = query(
                    collections.sessions(event.id),
                    where('speakers', 'array-contains', speakerId)
                )
                const snapshot = await getDocs(sessionsQuery)
                if (snapshot.empty) {
                    const speaker = speakersData?.[speakerId]
                    if (speaker) {
                        orphaned.push(speaker)
                    }
                }
            }
            return orphaned
        },
        [event.id, sessionResult.data?.speakersData]
    )

    const deleteOrphans = useCallback(
        async (speakerIds: string[]) => {
            setOrphanDeleting(true)
            try {
                const batch = writeBatch(collections.speakers(event.id).firestore)
                for (const speakerId of speakerIds) {
                    const speakerRef = doc(collections.speakers(event.id), speakerId)
                    batch.delete(speakerRef)
                }
                await batch.commit()
                setOrphanDeleteOpen(false)
                setLocation('/sessions')
            } catch (error) {
                console.error('Failed to delete orphaned speakers', error)
            } finally {
                setOrphanDeleting(false)
            }
        },
        [event.id, setLocation]
    )

    if (sessionResult.isLoading || !sessionResult.data) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sessionResult} />
    }

    const session = sessionResult.data
    const isSessionInSchedule = session.dates && !!session.dates.start

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Button onClick={() => setLocation('/sessions')} startIcon={<ArrowBack />}>
                All sessions
            </Button>
            <Card sx={{ paddingX: 2 }}>
                <Typography variant="h2">{session.title}</Typography>

                <EventSessionForm event={event} session={session} onSubmit={(session) => mutation.mutate(session)} />
                {mutation.isError && (
                    <Typography color="error">Error while saving session: {mutation.error?.message}</Typography>
                )}
            </Card>

            <Box mt={2}>
                <Button color="warning" onClick={() => setDeleteOpen(true)}>
                    Delete session
                </Button>
                {isSessionInSchedule && (
                    <Button
                        onClick={async () => {
                            await mutation.mutate({ ...session, dates: null })
                            sessionResult.load()
                        }}>
                        Remove from schedule
                    </Button>
                )}
            </Box>

            <DeleteSessionDialog
                open={deleteOpen}
                loading={documentDeletion.isLoading}
                session={session}
                onClose={() => setDeleteOpen(false)}
                onAccept={async () => {
                    const speakerIds = session.speakers || []
                    await documentDeletion.mutate()
                    setDeleteOpen(false)

                    if (speakerIds.length > 0) {
                        const orphaned = await findOrphanedSpeakers(speakerIds)
                        if (orphaned.length > 0) {
                            setOrphanedSpeakers(orphaned)
                            setOrphanDeleteOpen(true)
                            return
                        }
                    }
                    setLocation('/sessions')
                }}
            />

            <DeleteOrphanedSpeakersDialog
                open={orphanDeleteOpen}
                loading={orphanDeleting}
                speakers={orphanedSpeakers}
                onClose={() => {
                    setOrphanDeleteOpen(false)
                    setLocation('/sessions')
                }}
                onAccept={deleteOrphans}
            />
        </Container>
    )
}
