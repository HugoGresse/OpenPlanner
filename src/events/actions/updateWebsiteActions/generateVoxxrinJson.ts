import { Event, Session, Speaker, SponsorCategory } from '../../../types'
import { getIndividualDays } from '../../../utils/dates/diffDays'
import { hexContrast } from '../../../utils/colors/hexContrast'

export const generateVoxxrinJson = (
    event: Event,
    sessions: Session[],
    speaker: Speaker[],
    sponsors: SponsorCategory[]
) => {
    const days = getIndividualDays(event.dates.start, event.dates.end)

    if (!days || days.length === 0) {
        console.warn('Voxxrin: no days found')
        return null
    }
    if (!event.dates.start || !event.dates.end) {
        console.warn('Voxxrin: no start or end date found')
        return null
    }

    if (!event.logoUrl) {
        alert('Voxxrin: no logoUrl set in the event settings')
        return null
    }
    if (!event.backgroundUrl) {
        alert('Voxxrin: no backgroundUrl set in the event settings')
        return null
    }

    // TODO : supportedTalkLanguages
    const supportedTalkLanguages = [{ id: 'fr', themeColor: '#000000', label: 'Français' }]
    // TODO : eventTimezone
    const eventTimezone = 'Europe/Paris'

    const logoUrl = event.logoUrl
    const backgroundUrl = event.backgroundUrl

    const voxxrinJson: {
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
                primaryHex: string
                primaryContrastHex: string
                secondaryHex: string
                secondaryContrastHex: string
                tertiaryHex: string
                tertiaryContrastHex: string
            }
        }
        supportedTalkLanguages: { id: string; themeColor: string; label: string }[]
        rooms: { id: string; title: string }[]
        talkTracks: { id: string; title: string; themeColor: string }[]
        talkFormats: { id: string; title: string; duration: string; themeColor: string }[]
        features: {
            favoritesEnabled: boolean
            roomsDisplayed: boolean
            remindMeOnceVideosAreAvailableEnabled: boolean
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
            typeBackgroundColor: string
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
                primaryHex: event.color || '#F78125',
                primaryContrastHex: hexContrast(event.color || '#F78125'),
                secondaryHex: event.colorSecondary || '#3880FF',
                secondaryContrastHex: hexContrast(event.colorSecondary || '#3880FF'),
                tertiaryHex: event.colorBackground || '#202020',
                tertiaryContrastHex: hexContrast(event.colorBackground || '#202020'),
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
            remindMeOnceVideosAreAvailableEnabled: false,
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
            typeFontColor: event.color || '#000000',
            typeBackgroundColor: event.colorBackground || '#E5E4E2',
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
