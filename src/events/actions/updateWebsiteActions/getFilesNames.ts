import { Event, EventFiles } from '../../../types'
import { doc, updateDoc } from 'firebase/firestore'
import { baseStorageUrl, collections } from '../../../services/firebase'
import { v4 as uuidv4 } from 'uuid'

export const getFilesNames = async (event: Event): Promise<EventFiles> => {
    if (!event.files || !event.files.imageFolder || !event.files.openfeedback || !event.files.voxxrin) {
        const publicFile = event.files?.public || `events/${event.id}/${uuidv4()}.json`
        const openFeedbackFile = event.files?.openfeedback || `events/${event.id}/${uuidv4()}-openfeedback.json`
        const voxxrinFile = event.enableVoxxrin
            ? event.files?.voxxrin || `events/${event.id}/${uuidv4()}-voxxrin.json`
            : null
        const privateFile = event.files?.private || `events/${event.id}/${uuidv4()}-private.json`
        const imageFolder = event.files?.imageFolder || `events/${event.id}/`

        // update event to add file path
        await updateDoc(doc(collections.events, event.id), {
            files: {
                public: publicFile,
                private: privateFile,
                imageFolder: imageFolder,
                openfeedback: openFeedbackFile,
                voxxrin: voxxrinFile,
            },
        })
        return {
            public: publicFile,
            private: privateFile,
            imageFolder: imageFolder,
            openfeedback: openFeedbackFile,
            voxxrin: voxxrinFile,
        }
    }
    return event.files
}

export const getUploadFilePathFromEvent = async (event: Event) => {
    const files = await getFilesNames(event)
    return getUploadFilePath(files)
}

export const getUploadFilePath = (files: EventFiles) => {
    return {
        public: `${baseStorageUrl}/${files.public}`,
        private: `${baseStorageUrl}/${files.private}`,
        imageFolder: `${baseStorageUrl}/${files.imageFolder}`,
        openfeedback: `${baseStorageUrl}/${files.openfeedback}`,
        voxxrin: files.voxxrin ? `${baseStorageUrl}/${files.voxxrin}` : null,
    }
}
