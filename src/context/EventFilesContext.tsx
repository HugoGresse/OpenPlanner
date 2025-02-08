import { createContext, useContext, useMemo } from 'react'
import { Event, EventFiles } from '../types'
import { useOpenPlannerApi } from '../services/hooks/useOpenPlannerApi'
import { useEnsureApiKey } from '../services/hooks/useEnsureApiKey'

interface EventFilesContextType {
    filesPath: EventFiles
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
}

const EventFilesContext = createContext<EventFilesContextType | null>(null)

interface EventFilesProviderProps {
    event: Event
    children: React.ReactNode
}

export const EventFilesProvider = ({ event, children }: EventFilesProviderProps) => {
    useEnsureApiKey(event)

    const { data, isLoading, error, refetch } = useOpenPlannerApi<EventFiles>(event, 'deploy/files')

    const value = useMemo(
        () => ({
            filesPath: data || {
                public: '',
                private: '',
                openfeedback: '',
                voxxrin: '',
                imageFolder: '',
            },
            isLoading,
            error,
            refetch,
        }),
        [data, isLoading, error, refetch]
    )

    return <EventFilesContext.Provider value={value}>{children}</EventFilesContext.Provider>
}

export const useEventFiles = (): EventFilesContextType => {
    const context = useContext(EventFilesContext)
    if (!context) {
        throw new Error('useEventFiles must be used within an EventFilesProvider')
    }
    return context
}
