import { collections } from '../firebase'
import { DocumentData, query } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { TeamMember } from '../../types'

export const useTeam = (eventId: string): UseQueryResult<DocumentData> => {
    return useFirestoreCollection<TeamMember>(query(collections.team(eventId)), true)
}

export type TeamsByTeam = {
    [team: string]: TeamMember[]
}

export const useTeamByTeams = (teams: string[]): UseQueryResult<TeamsByTeam> => {
    const result = useFirestoreCollection<TeamMember>(query(collections.team(teams[0])), true)

    const groupedTeams: TeamsByTeam = {}
    if (result.data) {
        result.data.forEach((member) => {
            const team = member.team || 'default'
            if (!groupedTeams[team]) {
                groupedTeams[team] = []
            }
            groupedTeams[team].push(member)
        })
    }

    return {
        ...result,
        data: result.data ? groupedTeams : null,
    }
}
