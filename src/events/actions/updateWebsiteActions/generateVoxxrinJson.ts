import { Event, Session, Speaker, Sponsor, SponsorCategory } from '../../../types'
import { getIndividualDays } from '../../../utils/dates/diffDays'

export const generateVoxxrinJson = (
    event: Event,
    sessions: Session[],
    speaker: Speaker[],
    sponsors: SponsorCategory[]
) => {
    const days = getIndividualDays(event.dates.start, event.dates.end)

    if (!days || days.length === 0) {
        console.warn('No days found')
        return {}
    }
    if (!event.dates.start || !event.dates.end) {
        console.warn('No start or end date found')
        return {}
    }

    // TODO : supportedTalkLanguages
    const supportedTalkLanguages = [{ id: 'fr', themeColor: '#000000', label: 'Français' }]
    // TODO : eventFamily
    const eventFamily = ''
    // TODO : eventTimezone
    const eventTimezone = 'Europe/Paris'

    // TODO : logoUrl, backgroundUrl
    const logoUrl = ''
    const backgroundUrl = ''

    const voxxrinJson: {
        eventFamily: string
        title: string
        headingTitle: string
        timezone: string
        start: string
        end: string
        days: { id: string; localDate: string }[]
        logoUrl: string
        backgroundUrl: string
        theming: {
            colors: {
                primaryHex: '#F78125'
                primaryContrastHex: '#FFFFFF'
                secondaryHex: '#3880FF'
                secondaryContrastHex: '#FFFFFF'
                tertiaryHex: '#202020'
                tertiaryContrastHex: '#FFFFFF'
            }
        }
        supportedTalkLanguages: { id: string; themeColor: string; label: string }[]
        rooms: { id: string; title: string }[]
        talkTracks: { id: string; title: string; themeColor: string }[]
        talkFormats: { id: string; title: string; duration: string; themeColor: string }[]
        features: {
            favoritesEnabled: true
            roomsDisplayed: true
            remindMeOnceVideosAreAvailableEnabled: true
            showInfosTab: true
            showRoomCapacityIndicator: false
            hideLanguages: []
            ratings: {
                scale: {
                    enabled: boolean
                }
                bingo: {
                    enabled: boolean
                }
                'free-text': {
                    enabled: boolean
                }
            }
        }
        sponsors: {
            type: string
            typeColor: string
            typeFontColor: string
            sponsorships: {
                name: string
                logoUrl: string
                href: string
            }[]
        }[]
        sessions: {
            [key: string]: any
        }
        speakers: {
            [key: string]: any
        }
    } = {
        eventFamily: eventFamily,
        title: event.name,
        headingTitle: event.name,
        timezone: eventTimezone,
        start: event.dates.start?.toISOString(),
        end: event.dates.end?.toISOString(),
        days: days.map((day) => ({
            id: day.start.toISO() || Math.random().toString(),
            localDate: day.start.toLocaleString(),
        })),
        logoUrl: logoUrl,
        backgroundUrl: backgroundUrl,
        theming: {
            colors: {
                primaryHex: '#F78125',
                primaryContrastHex: '#FFFFFF',
                secondaryHex: '#3880FF',
                secondaryContrastHex: '#FFFFFF',
                tertiaryHex: '#202020',
                tertiaryContrastHex: '#FFFFFF',
            },
        },
        supportedTalkLanguages: supportedTalkLanguages,
        rooms: event.tracks.map((track) => ({ id: track.id, title: track.name })),
        talkTracks: event.categories.map((category) => ({
            id: category.id,
            title: category.name,
            themeColor: category.color || '#000000',
        })),
        talkFormats: event.formats.map((format) => ({
            id: format.id,
            title: format.name,
            duration: `PT${format.durationMinutes}m`,
            themeColor: '#000000',
        })),
        features: {
            favoritesEnabled: true,
            roomsDisplayed: true,
            remindMeOnceVideosAreAvailableEnabled: true,
            showInfosTab: true,
            showRoomCapacityIndicator: false,
            hideLanguages: [],
            ratings: {
                scale: {
                    enabled: false,
                },
                bingo: {
                    enabled: false,
                },
                'free-text': {
                    enabled: false,
                },
            },
        },
        sponsors: sponsors.map((sponsorCategory) => ({
            type: sponsorCategory.name,
            typeColor: '#000000',
            typeFontColor: '#000000',
            sponsorships: sponsorCategory.sponsors
                .map((sponsor) => ({
                    name: sponsor.name,
                    logoUrl: sponsor.logoUrl,
                    href: sponsor.website || '',
                }))
                .filter((sponsor) => !!sponsor.href && sponsor.href.length > 0),
        })),
        sessions: {},
        speakers: {},
    }

    sessions.forEach((session) => {
        if (!session.showInFeedback) {
            return
        }

        const tags = []

        const categoryName = session.category
            ? event.categories.find((category) => category.id === session.category)?.name
            : []

        if (categoryName) {
            tags.push(categoryName)
        }

        voxxrinJson.sessions[session.id] = {
            speakers: session.speakers,
            tags: tags,
            title: session.title,
            id: session.id,
            startTime: session.dates?.start?.toISO(),
            endTime: session.dates?.end?.toISO(),
            trackTitle: event.tracks.find((track) => track.id === session.trackId)?.name,
        }
    })

    speaker.forEach((speaker) => {
        voxxrinJson.speakers[speaker.id] = {
            name: speaker.name,
            photoUrl: speaker.photoUrl,
            socials: speaker.socials,
            id: speaker.id,
        }
    })

    return voxxrinJson
}
