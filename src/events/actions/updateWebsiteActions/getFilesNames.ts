import { Event, EventFiles } from '../../../types'
import { doc, updateDoc } from 'firebase/firestore'
import { collections } from '../../../services/firebase'
import { v4 as uuidv4 } from 'uuid'

export const getFilesNames = async (event: Event): Promise<EventFiles> => {
    if (!event.files) {
        const publicFile = `events/${event.id}/${uuidv4()}.json`
        const privateFile = `events/${event.id}/${uuidv4()}-private.json`

        // update event to add file path
        await updateDoc(doc(collections.events, event.id), {
            files: {
                public: publicFile,
                private: privateFile,
            },
        })
        return {
            public: publicFile,
            private: privateFile,
        }
    }
    return event.files
}
