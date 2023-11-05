import { TeamMember } from '../../types'
import { getDocs } from 'firebase/firestore'
import { collections } from '../../services/firebase'

export const getTeam = async (eventId: string): Promise<TeamMember[]> => {
    const snapshots = await getDocs(collections.team(eventId))

    return snapshots.docs.map((snapshot) => ({
        ...snapshot.data(),
    }))
}
