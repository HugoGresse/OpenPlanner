import { doc, updateDoc } from 'firebase/firestore'
import { Session } from '../../../types'
import { collections } from '../../../services/firebase'

export const updateSessionTemplate = async (eventId: string, session: Session): Promise<void> => {
    const ref = doc(collections.sessionsTemplate(eventId), session.id)

    return await updateDoc(ref, {
        ...session,
        dates: {
            start: session.dates?.start ? session.dates.start.toJSDate() : null,
            end: session.dates?.end ? session.dates.end.toJSDate() : null,
        },
    })
}
