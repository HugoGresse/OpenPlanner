import { FormControlLabel, Switch } from '@mui/material'
import { Event } from '../../../../../types'
import { collections } from '../../../../../services/firebase'
import { doc } from 'firebase/firestore'
import { useFirestoreDocumentMutation } from '../../../../../services/hooks/firestoreMutationHooks'
import { v4 as uuidv4 } from 'uuid'

export type JobPostSettingsProps = {
    event: Event
}

export const JobPostSettings = ({ event }: JobPostSettingsProps) => {
    const eventMutation = useFirestoreDocumentMutation(doc(collections.events, event.id))

    const toggleJobPostEnabled = async (enabled: boolean) => {
        if (enabled) {
            const privateId = event.addJobPostPrivateId || uuidv4()
            eventMutation.mutate({
                addJobPostEnabled: true,
                addJobPostPrivateId: privateId,
            })
        } else {
            eventMutation.mutate({
                addJobPostEnabled: false,
            })
        }
    }

    return (
        <FormControlLabel
            control={
                <Switch checked={event.addJobPostEnabled} onChange={(e) => toggleJobPostEnabled(e.target.checked)} />
            }
            label="Enable sponsor job posts"
        />
    )
}
