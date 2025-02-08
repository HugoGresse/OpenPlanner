import { Event } from '../../../../../../src/types'
import { getFilesNames } from './getFilesNames'
import firebase from 'firebase-admin'
import { getStorageBucketName } from '../../../dao/firebasePlugin'

export const updateStaticJson = async (
    firebaseApp: firebase.app.App,
    event: Event,
    outputPublic: {},
    outputPrivate: {},
    outputOpenFeedback: { sessions: { [p: string]: any }; speakers: { [p: string]: any } },
    outputVoxxrin: {} | null
) => {
    const fileNames = await getFilesNames(firebaseApp, event)
    const storageBucket = getStorageBucketName()
    const bucket = firebaseApp.storage().bucket(storageBucket)

    const metadata = {
        contentType: 'application/json',
    }

    const promiseArray = [
        bucket.file(fileNames.public).save(JSON.stringify(outputPublic), { metadata }),
        bucket.file(fileNames.private).save(JSON.stringify(outputPrivate), { metadata }),
        bucket.file(fileNames.openfeedback).save(JSON.stringify(outputOpenFeedback), { metadata }),
    ]

    if (outputVoxxrin !== null && fileNames.voxxrin) {
        promiseArray.push(bucket.file(fileNames.voxxrin).save(JSON.stringify(outputVoxxrin), { metadata }))
    }

    await Promise.all(promiseArray)

    return fileNames
}
