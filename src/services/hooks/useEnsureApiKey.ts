import { useCallback, useEffect } from 'react'
import { Event } from '../../types'
import { collections } from '../firebase'
import { doc, DocumentReference, updateDoc } from 'firebase/firestore'
import { generateApiKey } from '../../utils/generateApiKey'

export async function ensureEventApiKey(event: Event, eventRef: DocumentReference): Promise<string> {
    if (!event.apiKey) {
        const newApiKey = generateApiKey()
        await updateDoc(eventRef, { apiKey: newApiKey })
        return newApiKey
    }
    return event.apiKey
}

export const useEnsureApiKey = (event: Event) => {
    const eventRef = doc(collections.events, event.id)

    const ensureApiKey = useCallback(async () => {
        return ensureEventApiKey(event, eventRef)
    }, [event, eventRef])

    useEffect(() => {
        if (!event.apiKey) {
            ensureApiKey()
        }
    }, [event.apiKey, ensureApiKey])

    return { ensureApiKey }
}
