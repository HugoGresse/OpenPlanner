import firebase from 'firebase-admin'
import { NotFoundError } from '../other/Errors'
import { isNotFoundError } from '../other/daoErrors'

// One round trip: the `exists` precondition makes Firestore reject the delete of a missing document.
export const deleteDocumentOr404 = async (
    ref: firebase.firestore.DocumentReference,
    notFoundMessage: string
): Promise<void> => {
    try {
        await ref.delete({ exists: true })
    } catch (error: unknown) {
        if (isNotFoundError(error)) throw new NotFoundError(notFoundMessage)
        throw error
    }
}

// `update` fails with NOT_FOUND on a missing document, so a patch never creates one.
export const updateDocumentOr404 = async (
    ref: firebase.firestore.DocumentReference,
    data: firebase.firestore.UpdateData<firebase.firestore.DocumentData>,
    notFoundMessage: string
): Promise<void> => {
    try {
        await ref.update(data)
    } catch (error: unknown) {
        if (isNotFoundError(error)) throw new NotFoundError(notFoundMessage)
        throw error
    }
}
