import firebase from 'firebase-admin'
import { getStorageBucketName } from '../../../dao/firebasePlugin'
import { checkFileTypes } from '../../../other/checkFileTypes'
import { v4 as uuidv4 } from 'uuid'

export const uploadBufferToStorage = async (
    firebase: firebase.app.App,
    buffer: Buffer,
    eventId: string,
    fileName: string
): Promise<[boolean, string]> => {
    const storageBucket = getStorageBucketName()

    const fileType = await checkFileTypes(buffer, fileName)

    if (!fileType) {
        return [false, 'Invalid or unknown file type']
    }

    const { mime, extension } = fileType

    const bucket = firebase.storage().bucket(storageBucket)
    const fileName50char = fileName.slice(0, 50)
    const path = `events/${eventId}/${uuidv4()}_${fileName50char}.${extension}`
    const bucketFile = bucket.file(path)

    try {
        await bucketFile.save(buffer, {
            contentType: mime,
            predefinedAcl: 'publicRead',
        })
    } catch (error) {
        console.warn('error uploading file', error)
        const errorString = '' + error
        return [false, 'Error uploading file, ' + errorString]
    }
    await bucketFile.makePublic()

    const publicFileUrl = `https://${bucketFile.bucket.name}.storage.googleapis.com/${bucketFile.name}`

    return [true, publicFileUrl]
}
