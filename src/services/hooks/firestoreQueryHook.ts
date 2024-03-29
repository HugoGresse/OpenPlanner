import {
    DocumentData,
    DocumentReference,
    DocumentSnapshot,
    getDoc,
    getDocs,
    onSnapshot,
    Query,
    QuerySnapshot,
} from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'

export type UseQueryResult<T = unknown> = {
    isLoading: boolean
    load: () => void
    error: string
    isError: boolean
    data: T | null
    loaded: boolean
}

export const useFirestoreCollection = <T>(query: Query<T>, subscribe: boolean = false): UseQueryResult<T[]> => {
    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [data, setData] = useState<T[]>()

    const isError = error !== ''

    const docTransformer = (querySnapshot: QuerySnapshot<T, DocumentData>) => {
        setData(
            querySnapshot.docs.map((doc: DocumentData) => ({
                id: doc.id,
                ...(doc.data() as T),
            }))
        )
    }

    const load = useCallback(() => {
        setLoading(true)

        let unsubcribeFunc = () => {}

        try {
            if (subscribe) {
                unsubcribeFunc = onSnapshot(query, (querySnapshot) => {
                    docTransformer(querySnapshot)
                    setLoading(false)
                })
            } else {
                getDocs(query).then((querySnapshot) => {
                    docTransformer(querySnapshot)
                    setLoading(false)
                })
            }
        } catch (error: any) {
            console.log(error)
            setError(error.message)
        }

        return unsubcribeFunc
    }, [])

    useEffect(() => {
        return load()
    }, [load])

    return {
        isLoading,
        load,
        error,
        isError,
        data: data || null,
        loaded: data !== undefined,
    }
}

export const useFirestoreDocument = <T>(ref: DocumentReference<T>, subscribe: boolean = false): UseQueryResult<T> => {
    const [isLoading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [data, setData] = useState<T>()

    const isError = error !== ''

    const docTransformer = (querySnapshot: DocumentSnapshot<T, DocumentData>) => {
        const d = querySnapshot.data()

        if (d === undefined) {
            return
        }

        setData({
            id: querySnapshot.id,
            ...(d as T),
        })
    }

    const load = useCallback(() => {
        setLoading(true)

        let unsubcribeFunc = () => {}

        try {
            if (subscribe) {
                unsubcribeFunc = onSnapshot(ref, (docSnapshot) => {
                    docTransformer(docSnapshot)
                    setLoading(false)
                })
            } else {
                getDoc(ref).then((docSnapshot) => {
                    docTransformer(docSnapshot)
                    setLoading(false)
                })
            }
        } catch (error: any) {
            console.log(error)
            setError(error.message)
        }

        return unsubcribeFunc
    }, [])

    useEffect(() => {
        return load()
    }, [])

    return {
        isLoading,
        load,
        error,
        isError,
        data: data || null,
        loaded: data !== undefined,
    }
}
