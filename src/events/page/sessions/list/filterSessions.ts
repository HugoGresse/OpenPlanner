import { Session } from '../../../../types'
import { TeasingPostSocials } from '../../../actions/sessions/generation/generateSessionTeasingContent'

export type SessionsFilters = {
    search: string
    category: string | null
    format: string | null
    withoutSpeaker: boolean
    notAnnouncedOn: TeasingPostSocials[]
}

export const filterSessions = (sessions: Session[], filters: SessionsFilters): Session[] => {
    const searchFiltered = filters.search.toLowerCase().trim()
    return sessions.filter((s) => {
        if (filters.category && s.category !== filters.category) {
            return false
        }
        if (filters.format && s.format !== filters.format) {
            return false
        }
        if (filters.withoutSpeaker && s.speakers.length > 0) {
            return false
        }

        if (filters.notAnnouncedOn.length > 0) {
            return filters.notAnnouncedOn.some((social) => !s.announcedOn?.[social])
        }

        if (s.title.toLowerCase().includes(searchFiltered)) {
            return true
        }
        if (s.note?.toLowerCase().includes(searchFiltered)) {
            return true
        }
        if (s.formatText?.toLowerCase().includes(searchFiltered)) {
            return true
        }
        if (s.categoryObject?.name.toLowerCase().includes(searchFiltered)) {
            return true
        }
        if (s.speakersData?.find((s) => s?.name.toLowerCase().includes(searchFiltered))) {
            return true
        }
        return false
    })
}
