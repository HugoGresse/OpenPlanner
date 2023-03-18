import { getDocs } from 'firebase/firestore'
import { conferenceHallCollections } from './conferenceHallFirebase'
import { ConferenceHallProposal } from '../../types'

export const getConferenceHallProposals = async (chEventId: string) => {
    const snapshot = await getDocs(conferenceHallCollections.proposals(chEventId))

    return snapshot.docs.map(
        (proposal) =>
            ({
                ...proposal.data(),
            } as ConferenceHallProposal)
    )
}
