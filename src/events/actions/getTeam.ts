import { TeamMember } from '../../types'
import { getDocs } from 'firebase/firestore'
import { collections } from '../../services/firebase'

export const getTeam = async (eventId: string): Promise<TeamMember[]> => {
    const snapshots = await getDocs(collections.team(eventId))

    return snapshots.docs.map((snapshot) => ({
        ...snapshot.data(),
    }))
}

export const getTeams = async (
    eventId: string
): Promise<{
    team: TeamMember[]
    teams: { id: string; members: TeamMember[]; order: number }[]
}> => {
    const snapshots = await getDocs(collections.team(eventId))

    const members = snapshots.docs.map((snapshot) => ({
        ...snapshot.data(),
        id: snapshot.id,
    })) as TeamMember[]

    // Group members by team
    const teamGroups = members.reduce((acc, member) => {
        const teamId = member.team || 'default'
        if (!acc[teamId]) {
            acc[teamId] = {
                id: teamId,
                members: [],
                order: member.teamOrder || 0, // Default high order for unspecified
            }
        }
        acc[teamId].members.push(member)
        return acc
    }, {} as Record<string, { id: string; members: TeamMember[]; order: number }>)

    const teamOrdered = Object.values(teamGroups)
        .map((team) => ({
            id: team.id,
            order: team.order,
            members: team.members.toSorted((a, b) => (a.order || 999) - (b.order || 999)),
        }))
        .sort((a, b) => a.order - b.order)

    // Sort teams by teamOrder and flatten the structure
    return {
        team: members,
        teams: teamOrdered,
    }
}
