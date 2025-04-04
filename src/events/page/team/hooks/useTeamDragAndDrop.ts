import { useCallback, useRef, useState } from 'react'
import {
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    CollisionDetection,
    getFirstCollision,
    pointerWithin,
    rectIntersection,
    closestCenter,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { DraggableItem, TeamDragItem, MemberDragItem, TeamMember } from '../../../../types'
import { useFirestoreDocumentMutationWithId } from '../../../../services/hooks/firestoreMutationHooks'
import { collections } from '../../../../services/firebase'

type TeamDataState = {
    [key: string]: TeamMember[]
}

export const useTeamDragAndDrop = (eventId: string) => {
    const [activeItem, setActiveItem] = useState<DraggableItem | null>(null)
    const [activeTeam, setActiveTeam] = useState<string | null>(null)
    const [teamOrder, setTeamOrder] = useState<string[]>([])
    const [localTeamData, setLocalTeamData] = useState<TeamDataState>({})
    const lastOverId = useRef<string | null>(null)
    const memberMutation = useFirestoreDocumentMutationWithId(collections.team(eventId))

    const collisionDetectionStrategy: CollisionDetection = useCallback(
        (args) => {
            if (!activeItem) return rectIntersection(args)

            if (activeItem.type === 'team') {
                return closestCenter({
                    ...args,
                    droppableContainers: args.droppableContainers.filter((container) =>
                        teamOrder.includes(container.id.toString())
                    ),
                })
            }

            // Get both pointer and rect intersections
            const pointerIntersections = pointerWithin(args)
            const rectIntersections = rectIntersection(args)

            // Combine both types of intersections, prioritizing pointer intersections
            const intersections = [...pointerIntersections, ...rectIntersections]

            if (intersections.length === 0) {
                // If no intersections found and we have a last known position, maintain it
                // but only if it's still a valid container
                if (
                    lastOverId.current &&
                    args.droppableContainers.find((container) => container.id.toString() === lastOverId.current)
                ) {
                    return [{ id: lastOverId.current }]
                }
                return []
            }

            let overId = getFirstCollision(intersections, 'id')?.toString()

            if (overId) {
                if (teamOrder.includes(overId)) {
                    const teamMembers = localTeamData[overId] || []
                    if (teamMembers.length > 0) {
                        const closestMemberCollisions = closestCenter({
                            ...args,
                            droppableContainers: args.droppableContainers.filter((container) =>
                                teamMembers.some((m) => m.id === container.id.toString())
                            ),
                        })

                        if (closestMemberCollisions.length > 0) {
                            overId = closestMemberCollisions[0].id.toString()
                        }
                    }
                }

                lastOverId.current = overId
                return [{ id: overId }]
            }

            return []
        },
        [activeItem, teamOrder, localTeamData]
    )

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const activeId = active.id.toString()

        if (teamOrder.includes(activeId)) {
            setActiveItem({
                id: activeId,
                type: 'team',
                teamName: activeId,
            } as TeamDragItem)
        } else {
            for (const [teamName, members] of Object.entries(localTeamData)) {
                if (members.some((m) => m.id === activeId)) {
                    setActiveItem({
                        id: activeId,
                        type: 'member',
                        memberId: activeId,
                        sourceTeam: teamName,
                    } as MemberDragItem)
                    setActiveTeam(teamName)
                    break
                }
            }
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over || !activeItem) return

        const overId = over.id.toString()
        const isOverTeam = teamOrder.includes(overId)

        if (activeItem.type === 'member') {
            if (isOverTeam) return

            let targetTeam = overId
            for (const [teamName, members] of Object.entries(localTeamData)) {
                if (members.some((m) => m.id === overId)) {
                    targetTeam = teamName
                    break
                }
            }

            if (targetTeam !== activeTeam) {
                const memberId = active.id.toString()
                const sourceTeam = activeTeam!
                const memberToMove = localTeamData[sourceTeam].find((m) => m.id === memberId)

                if (memberToMove) {
                    setLocalTeamData((prevData) => {
                        const newData = { ...prevData }
                        newData[sourceTeam] = newData[sourceTeam].filter((m) => m.id !== memberId)
                        newData[targetTeam] = [
                            ...newData[targetTeam],
                            { ...memberToMove, team: targetTeam, order: newData[targetTeam].length },
                        ]
                        return newData
                    })
                    setActiveTeam(targetTeam)
                }
            } else {
                // Reordering within the same team
                const currentTeam = activeTeam!
                const activeIndex = localTeamData[currentTeam].findIndex((m) => m.id === active.id.toString())
                const overIndex = localTeamData[currentTeam].findIndex((m) => m.id === overId)

                if (activeIndex !== overIndex) {
                    setLocalTeamData((prevData) => {
                        const newData = { ...prevData }
                        const newMembers = arrayMove(newData[currentTeam], activeIndex, overIndex)
                        // Update order for all members
                        newMembers.forEach((member, index) => {
                            member.order = index
                        })
                        newData[currentTeam] = newMembers
                        return newData
                    })
                }
            }
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || !activeItem) {
            setActiveItem(null)
            setActiveTeam(null)
            return
        }

        if (activeItem.type === 'team') {
            const oldIndex = teamOrder.indexOf(active.id.toString())
            const newIndex = teamOrder.indexOf(over.id.toString())
            const newOrder = arrayMove(teamOrder, oldIndex, newIndex)

            setTeamOrder(newOrder)

            // Batch all member updates
            newOrder.forEach((teamName, index) => {
                const members = localTeamData[teamName] || []
                members.forEach((member) => {
                    const editedMember: TeamMember = {
                        ...member,
                        teamOrder: index,
                    }
                    memberMutation.mutate(editedMember, member.id)
                })
            })
        } else if (activeItem.type === 'member') {
            // Find the member in the local state and mutate it
            const memberId = active.id.toString()
            for (const [teamName, members] of Object.entries(localTeamData)) {
                const member = members.find((m) => m.id === memberId)
                if (member) {
                    memberMutation.mutate(member, member.id)
                    // Update all members in the team to ensure order is consistent
                    members.forEach((m) => {
                        if (m.id !== memberId) {
                            memberMutation.mutate(m, m.id)
                        }
                    })
                    break
                }
            }
        }

        setActiveItem(null)
        setActiveTeam(null)
    }

    return {
        activeItem,
        activeTeam,
        teamOrder,
        localTeamData,
        setTeamOrder,
        setLocalTeamData,
        collisionDetectionStrategy,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
    }
}
