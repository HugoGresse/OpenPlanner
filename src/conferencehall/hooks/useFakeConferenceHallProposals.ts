import { ConferenceHallProposal, ConferenceHallProposalState } from '../../types'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { randomEnum } from '../../utils/getRandomEnum'
import { DocumentData } from '@firebase/firestore'
import { UseQueryResult } from '../../services/hooks/firestoreQueryHook'

export const useFakeConferenceHallProposals = (eventId: string, count = 150): UseQueryResult<DocumentData> => {
    const [proposals, setProposals] = useState<ConferenceHallProposal[]>([])

    useEffect(() => {
        const p: ConferenceHallProposal[] = []
        for (let i = 0; i < count; i++) {
            p.push({
                title: uuidv4(),
                id: uuidv4(),
                abstract: uuidv4(),
                state: randomEnum(ConferenceHallProposalState),
                level: '',
                formats: '',
                owner: '',
                speakers: {
                    [uuidv4()]: true,
                },
            })
        }

        setProposals(p)
    }, [])

    // @ts-ignore
    return {
        isLoading: false,
        data: proposals,
    }
}
