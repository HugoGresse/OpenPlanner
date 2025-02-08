import { Event, EventFiles } from '../../types'
import { useOpenPlannerApi } from './useOpenPlannerApi'
import { useEnsureApiKey } from './useEnsureApiKey'

export const useEventFiles = (
    event: Event
): {
    filesPath: EventFiles
    isLoading: boolean
    error: string | null
    refetch: () => Promise<void>
} => {
    useEnsureApiKey(event)

    const { data, isLoading, error, refetch } = useOpenPlannerApi<EventFiles>(event, 'deploy/files')

    return {
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
    }
}
