import { useState } from 'react'
import { Event, Session } from '../../../../../types'
import { updateSessions } from '../../../../actions/sessions/updateSession'

export interface UseSessionsBatchEditProps {
    event: Event
    displayedSessions: Session[]
    reloadSessions: () => void
}

export interface UseSessionsBatchEditResult {
    selectedSessions: string[]
    handleSessionSelect: (sessionId: string, checked: boolean) => void
    handleSelectAll: (checked: boolean) => void
    batchEditDialogOpen: boolean
    openBatchEditDialog: () => void
    closeBatchEditDialog: () => void
    handleUpdateSessions: (sessionsToUpdate: Array<Partial<Session> & { id: string }>) => Promise<void>
}

export const useSessionsBatchEdit = ({
    event,
    displayedSessions,
    reloadSessions,
}: UseSessionsBatchEditProps): UseSessionsBatchEditResult => {
    const [selectedSessions, setSelectedSessions] = useState<string[]>([])
    const [batchEditDialogOpen, setBatchEditDialogOpen] = useState(false)

    const handleSessionSelect = (sessionId: string, checked: boolean) => {
        if (checked) {
            setSelectedSessions((prev) => [...prev, sessionId])
        } else {
            setSelectedSessions((prev) => prev.filter((id) => id !== sessionId))
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedSessions(displayedSessions.map((session) => session.id))
        } else {
            setSelectedSessions([])
        }
    }

    const openBatchEditDialog = () => {
        setBatchEditDialogOpen(true)
    }

    const closeBatchEditDialog = () => {
        setBatchEditDialogOpen(false)
    }

    const handleUpdateSessions = async (sessionsToUpdate: Array<Partial<Session> & { id: string }>) => {
        await updateSessions(event.id, sessionsToUpdate)
        setSelectedSessions([])
        reloadSessions()
    }

    return {
        selectedSessions,
        handleSessionSelect,
        handleSelectAll,
        batchEditDialogOpen,
        openBatchEditDialog,
        closeBatchEditDialog,
        handleUpdateSessions,
    }
}
