import { useCallback, useState } from 'react'
import { Event, Speaker } from '../../../types'
import {
    Box,
    Button,
    Card,
    Checkbox,
    Container,
    DialogContentText,
    FormControlLabel,
    List,
    ListItem,
    Typography,
} from '@mui/material'
import { useSession } from '../../../services/hooks/useSession'
import { useLocation, useRoute } from 'wouter'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { ArrowBack } from '@mui/icons-material'
import { getQueryParams } from '../../../utils/getQuerySearchParameters'
import { EventSessionForm } from './EventSessionForm'
import { deleteDoc, doc, getDocs, query, where } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import {
    useFirestoreDocumentDeletion,
    useFirestoreDocumentMutation,
} from '../../../services/hooks/firestoreMutationHooks'
import { useSpeakersMap } from '../../../services/hooks/useSpeakersMap'

export type EventSessionProps = {
    event: Event
}
export const EventSession = ({ event }: EventSessionProps) => {
    const [_, params] = useRoute('/:routeName/:sessionId/*?')
    const [_2, setLocation] = useLocation()

    const sessionId = params?.sessionId || ''
    const sessionResult = useSession(event.id, sessionId)
    const speakersMap = useSpeakersMap(event.id)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [orphanedSpeakers, setOrphanedSpeakers] = useState<Speaker[]>([])
    const [orphanDeleteOpen, setOrphanDeleteOpen] = useState(false)
    const [orphanDeleting, setOrphanDeleting] = useState(false)
    const [selectedOrphanIds, setSelectedOrphanIds] = useState<Set<string>>(new Set())
    const documentDeletion = useFirestoreDocumentDeletion(doc(collections.sessions(event.id), sessionId))
    const mutation = useFirestoreDocumentMutation(doc(collections.sessions(event.id), sessionId))

    const findOrphanedSpeakers = useCallback(
        async (speakerIds: string[]) => {
            const orphaned: Speaker[] = []
            for (const speakerId of speakerIds) {
                const sessionsQuery = query(
                    collections.sessions(event.id),
                    where('speakers', 'array-contains', speakerId)
                )
                const snapshot = await getDocs(sessionsQuery)
                if (snapshot.empty) {
                    const speaker = speakersMap.data?.[speakerId]
                    if (speaker) {
                        orphaned.push(speaker)
                    }
                }
            }
            return orphaned
        },
        [event.id, speakersMap.data]
    )

    const deleteSelectedOrphans = useCallback(async () => {
        setOrphanDeleting(true)
        try {
            for (const speakerId of selectedOrphanIds) {
                await deleteDoc(doc(collections.speakers(event.id), speakerId))
            }
        } finally {
            setOrphanDeleting(false)
            setOrphanDeleteOpen(false)
            setLocation('/sessions')
        }
    }, [event.id, selectedOrphanIds])

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

            <ConfirmDialog
                open={deleteOpen}
                title="Delete this session?"
                acceptButton="Delete session"
                disabled={documentDeletion.isLoading}
                loading={documentDeletion.isLoading}
                cancelButton="cancel"
                handleClose={() => setDeleteOpen(false)}
                handleAccept={async () => {
                    const speakerIds = session.speakers || []
                    await documentDeletion.mutate()
                    setDeleteOpen(false)

                    if (speakerIds.length > 0) {
                        const orphaned = await findOrphanedSpeakers(speakerIds)
                        if (orphaned.length > 0) {
                            setOrphanedSpeakers(orphaned)
                            setSelectedOrphanIds(new Set(orphaned.map((s) => s.id)))
                            setOrphanDeleteOpen(true)
                            return
                        }
                    }
                    setLocation('/sessions')
                }}>
                <DialogContentText id="alert-dialog-description">
                    {' '}
                    Delete the session {session.title} from this event (not the session's speaker(s))
                </DialogContentText>
            </ConfirmDialog>

            <ConfirmDialog
                open={orphanDeleteOpen}
                title="Delete orphaned speaker(s)?"
                acceptButton="Delete selected speaker(s)"
                disabled={orphanDeleting || selectedOrphanIds.size === 0}
                loading={orphanDeleting}
                cancelButton="Keep all"
                handleClose={() => {
                    setOrphanDeleteOpen(false)
                    setLocation('/sessions')
                }}
                handleAccept={deleteSelectedOrphans}>
                <DialogContentText>
                    The following speaker(s) are not linked to any other session. Do you want to delete them?
                </DialogContentText>
                <List dense>
                    {orphanedSpeakers.map((speaker) => (
                        <ListItem key={speaker.id} disablePadding>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={selectedOrphanIds.has(speaker.id)}
                                        onChange={(e) => {
                                            setSelectedOrphanIds((prev) => {
                                                const next = new Set(prev)
                                                if (e.target.checked) {
                                                    next.add(speaker.id)
                                                } else {
                                                    next.delete(speaker.id)
                                                }
                                                return next
                                            })
                                        }}
                                    />
                                }
                                label={speaker.name}
                            />
                        </ListItem>
                    ))}
                </List>
            </ConfirmDialog>
        </Container>
    )
}
