import firebase from 'firebase-admin'
import { TeamMember } from '../../../../src/types'
export class TeamDao {
    public static async getTeams(
        firebaseApp: firebase.app.App,
        eventId: string
    ): Promise<{
        team: TeamMember[]
        teams: { id: string; members: TeamMember[]; order: number }[]
    }> {
        const db = firebaseApp.firestore()
        const snapshot = await db.collection(`events/${eventId}/teams`).get()
        const members = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
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
}
