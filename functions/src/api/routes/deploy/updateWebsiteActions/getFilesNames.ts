import { Event, EventFiles } from '../../../../../../src/types'
import { v4 as uuidv4 } from 'uuid'
import { getStorageBucketName } from '../../../dao/firebasePlugin'
import firebase from 'firebase-admin'

export const getUploadFilePathFromEvent = async (firebaseApp: firebase.app.App, event: Event) => {
    const files = await getFilesNames(firebaseApp, event)
    return getUploadFilePath(files)
}

export const getFilesNames = async (firebaseApp: firebase.app.App, event: Event): Promise<EventFiles> => {
    if (
        !event.files ||
        !event.files.imageFolder ||
        !event.files.openfeedback ||
        !event.files.voxxrin ||
        !event.files.pdf
    ) {
        const publicFile = event.files?.public || `events/${event.id}/${uuidv4()}.json`
        const openFeedbackFile = event.files?.openfeedback || `events/${event.id}/${uuidv4()}-openfeedback.json`
        const voxxrinFile = event.enableVoxxrin
            ? event.files?.voxxrin || `events/${event.id}/${uuidv4()}-voxxrin.json`
            : null
        const privateFile = event.files?.private || `events/${event.id}/${uuidv4()}-private.json`
        const imageFolder = event.files?.imageFolder || `events/${event.id}/`
        const pdfFile = event.files?.pdf || null

        // update event to add file path
        const db = firebaseApp.firestore()
        await db
            .collection('events')
            .doc(event.id)
            .update({
                files: {
                    public: publicFile,
                    private: privateFile,
                    imageFolder: imageFolder,
                    openfeedback: openFeedbackFile,
                    voxxrin: voxxrinFile,
                    pdf: pdfFile,
                },
            })
        return {
            public: publicFile,
            private: privateFile,
            imageFolder: imageFolder,
            openfeedback: openFeedbackFile,
            voxxrin: voxxrinFile,
            pdf: pdfFile,
        }
    }
    return event.files
}

export const addPdfFileToEvent = async (firebaseApp: firebase.app.App, event: Event) => {
    if (!event.files?.pdf) {
        const db = firebaseApp.firestore()
        const pdfFileName = `events/${event.id}/schedule-${uuidv4()}.pdf`
        await db
            .collection('events')
            .doc(event.id)
            .update({
                files: {
                    ...event.files,
                    pdf: pdfFileName,
                },
            })
        return pdfFileName
    }
    return event.files.pdf
}

export const getUploadFilePath = (files: EventFiles) => {
    const storageBucket = getStorageBucketName()
    const baseStorageUrl = `https://storage.googleapis.com/${storageBucket}`
    return {
        public: `${baseStorageUrl}/${files.public}`,
        private: `${baseStorageUrl}/${files.private}`,
        imageFolder: `${baseStorageUrl}/${files.imageFolder}`,
        openfeedback: `${baseStorageUrl}/${files.openfeedback}`,
        voxxrin: files.voxxrin ? `${baseStorageUrl}/${files.voxxrin}` : null,
        pdf: files.pdf ? `${baseStorageUrl}/${files.pdf}` : null,
    }
}
