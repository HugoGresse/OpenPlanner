import { collections } from '../firebase'
import { query } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { BuildingBlock, Event } from '../../types'

// JS sort instead of orderBy('order'): Firestore silently drops docs missing the field
export const useBuildingBlocks = (event: Event): UseQueryResult<BuildingBlock[]> => {
    const r = useFirestoreCollection<BuildingBlock>(query(collections.buildingBlocks(event.id)), true)

    const data = r.data
        ? [...r.data].sort((a, b) => (isNaN(a.order) ? 0 : a.order) - (isNaN(b.order) ? 0 : b.order))
        : r.data

    return {
        ...r,
        data,
    }
}
