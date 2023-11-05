import { addDoc, CollectionReference, deleteDoc, DocumentReference, setDoc } from 'firebase/firestore'
import { useCallback, useState } from 'react'

export type UseMutationResult<T = unknown> = {
    isLoading: boolean
    error: { message: string } | null
    isError: boolean
    mutate: (data: object) => any
}

export const useFirestoreCollectionMutation = (ref: CollectionReference): UseMutationResult => {
    const [isLoading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const mutate = useCallback(
        async (data: any) => {
            try {
                setLoading(true)
                await addDoc(ref, data)
            } catch (error: any) {
                setError(error)
            }
            setLoading(false)
        },
        [ref]
    )

    return {
        isLoading,
        error,
        isError: error !== null,
        mutate,
    }
}
export const useFirestoreDocumentMutation = (ref: DocumentReference): UseMutationResult => {
    const [isLoading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const mutate = useCallback(
        async (data: any) => {
            try {
                setLoading(true)
                await setDoc(ref, data, { merge: true }) // We use setDoc to actually trigger the converter
            } catch (error: any) {
                setError(error)
            }
            setLoading(false)
        },
        [ref]
    )

    return {
        isLoading,
        error,
        isError: error !== null,
        mutate,
    }
}

export type UseDeletionMutationResult<T = unknown> = {
    isLoading: boolean
    error: { message: string } | null
    isError: boolean
    mutate: () => any
}
export const useFirestoreDocumentDeletion = (ref: DocumentReference): UseDeletionMutationResult => {
    const [isLoading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const mutate = useCallback(async () => {
        try {
            setLoading(true)
            await deleteDoc(ref)
        } catch (error: any) {
            setError(error)
        }
        setLoading(false)
    }, [ref])

    return {
        isLoading,
        error,
        isError: error !== null,
        mutate,
    }
}
