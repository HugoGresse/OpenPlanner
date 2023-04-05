import { Event } from '../../../types'
import { getFilesNames } from './getFilesNames'
import { ref, uploadString } from 'firebase/storage'
import { storage } from '../../../services/firebase'

export const updateStaticJson = async (event: Event, outputPublic: {}, outputPrivate: {}) => {
    const fileNames = await getFilesNames(event)

    const metadata = {
        contentType: 'application/json',
    }

    const outputRefPublic = ref(storage, fileNames.public)
    const outputRefPrivate = ref(storage, fileNames.private)

    await uploadString(outputRefPublic, JSON.stringify(outputPublic), undefined, metadata)
    await uploadString(outputRefPrivate, JSON.stringify(outputPrivate), undefined, metadata)

    return fileNames
}
