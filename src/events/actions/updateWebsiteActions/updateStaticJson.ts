import { Event } from '../../../types'
import { getFilesNames } from './getFilesNames'
import { ref, uploadString } from 'firebase/storage'
import { storage } from '../../../services/firebase'

export const updateStaticJson = async (
    event: Event,
    outputPublic: {},
    outputPrivate: {},
    outputOpenFeedback: { sessions: { [p: string]: any }; speakers: { [p: string]: any } }
) => {
    const fileNames = await getFilesNames(event)

    const metadata = {
        contentType: 'application/json',
    }

    const outputRefPublic = ref(storage, fileNames.public)
    const outputRefPrivate = ref(storage, fileNames.private)
    const outputRefOpenFeedback = ref(storage, fileNames.openfeedback)

    // noinspection ES6MissingAwait
    const promiseArray = [
        uploadString(outputRefPublic, JSON.stringify(outputPublic), undefined, metadata),
        uploadString(outputRefPrivate, JSON.stringify(outputPrivate), undefined, metadata),
        uploadString(outputRefOpenFeedback, JSON.stringify(outputOpenFeedback), undefined, metadata),
    ]

    await Promise.all(promiseArray)

    return fileNames
}
