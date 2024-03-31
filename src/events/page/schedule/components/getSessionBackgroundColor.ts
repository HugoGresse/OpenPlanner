import { Session } from '../../../../types'
import { DEFAULT_SESSION_CARD_BACKGROUND_COLOR } from '../scheduleConstants'

export const getSessionBackgroundColor = (session: Session) => {
    return session.categoryObject?.color || DEFAULT_SESSION_CARD_BACKGROUND_COLOR
}
