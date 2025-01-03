import { collections } from '../firebase'
import { DocumentData, query } from '@firebase/firestore'
import { useFirestoreCollection, UseQueryResult } from './firestoreQueryHook'
import { TeamMember } from '../../types'
import { useMemo } from 'react'

export const useTeam = (eventId: string): UseQueryResult<DocumentData> => {
    return useFirestoreCollection<TeamMember>(query(collections.team(eventId)), true)
}

export type TeamsByTeam = {
    [team: string]: TeamMember[]
}

export const useTeamByTeams = (teams: string[]): UseQueryResult<TeamsByTeam> => {
    const result = useFirestoreCollection<TeamMember>(query(collections.team(teams[0])), true)

    const groupedTeams = useMemo(() => {
        const teams =
            result.data?.reduce((groupedTeams: TeamsByTeam, member) => {
                const team = member.team || 'default'
                if (!groupedTeams[team]) {
                    groupedTeams[team] = []
                }
                groupedTeams[team].push(member)
                return groupedTeams
            }, {}) || {}

        // Sort members within each team by teamOrder
        Object.keys(teams).forEach((team) => {
            teams[team].sort((a, b) => (a.teamOrder || 0) - (b.teamOrder || 0))
        })

        // Create a new ordered object based on the minimum teamOrder of each team
        const orderedTeams: TeamsByTeam = {}
        Object.keys(teams)
            .sort((a, b) => {
                const minOrderA = Math.min(...teams[a].map((member) => member.teamOrder || 0))
                const minOrderB = Math.min(...teams[b].map((member) => member.teamOrder || 0))
                return minOrderA - minOrderB
            })
            .forEach((team) => {
                orderedTeams[team] = teams[team]
            })

        return orderedTeams
    }, [result.data])

    return {
        ...result,
        data: groupedTeams,
    }
}
