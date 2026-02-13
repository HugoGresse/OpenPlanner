import {
    Event,
    Faq,
    FaqCategory,
    NewEvent,
    Session,
    Speaker,
    SponsorCategory,
    TeamMember,
    JobPost,
    Ticket,
} from '../types'
import { FirestoreDataConverter, Timestamp } from '@firebase/firestore'
import { DateTime } from 'luxon'

export const eventConverter: FirestoreDataConverter<Event | NewEvent> = {
    fromFirestore(snapshot): Event {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
            dates: {
                start: data.dates?.start ? data.dates.start?.toDate() : null,
                end: data.dates?.end ? data.dates.end?.toDate() : null,
            },
            updatedAt: data.updatedAt ? data.updatedAt?.toDate() : null,
        } as Event
    },
    toFirestore(event: NewEvent) {
        return event
    },
}
export const event2Converter: FirestoreDataConverter<Event> = {
    fromFirestore(snapshot): Event {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
            dates: {
                start: data.dates?.start ? data.dates.start?.toDate() : null,
                end: data.dates?.end ? data.dates.end?.toDate() : null,
            },
            updatedAt: data.updatedAt ? data.updatedAt?.toDate() : null,
        } as Event
    },
    toFirestore(event: Event) {
        return event
    },
}

export const sessionConverter: FirestoreDataConverter<Session> = {
    fromFirestore(snapshot): Session {
        const data = snapshot.data()
        return {
            id: snapshot.id,
            ...data,
            category: data.category || null,
            dates: {
                start: data.dates?.start
                    ? typeof data.dates.start === 'string'
                        ? DateTime.fromISO(data.dates.start).set({ second: 0, millisecond: 0 })
                        : DateTime.fromJSDate(data.dates.start?.toDate()).set({ second: 0, millisecond: 0 })
                    : null,
                end: data.dates?.end
                    ? typeof data.dates.end === 'string'
                        ? DateTime.fromISO(data.dates.end).set({ second: 0, millisecond: 0 })
                        : DateTime.fromJSDate(data.dates.end?.toDate()).set({ second: 0, millisecond: 0 })
                    : null,
            },
        } as Session
    },
    toFirestore(session: Session) {
        return Object.keys(session).reduce((acc, key) => {
            // @ts-ignore
            acc[key] = session[key] === undefined ? null : session[key]
            return acc
        }, {})
    },
}

export const speakerConverter: FirestoreDataConverter<Speaker> = {
    fromFirestore(snapshot): Speaker {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
        } as Speaker
    },
    toFirestore(speaker: Speaker) {
        return speaker
    },
}

export const sponsorsConverter: FirestoreDataConverter<SponsorCategory | Omit<SponsorCategory, 'id'>> = {
    fromFirestore(snapshot): SponsorCategory {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
        } as SponsorCategory
    },
    toFirestore(category: Omit<SponsorCategory, 'id'>) {
        return category
    },
}

export const teamConverter: FirestoreDataConverter<TeamMember> = {
    fromFirestore(snapshot): TeamMember {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
        } as TeamMember
    },
    toFirestore(member: TeamMember) {
        return member
    },
}

export const faqConverter: FirestoreDataConverter<FaqCategory> = {
    fromFirestore(snapshot): FaqCategory {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
        } as FaqCategory
    },
    toFirestore(member: FaqCategory) {
        return member
    },
}

export const faqItemConverter: FirestoreDataConverter<Faq> = {
    fromFirestore(snapshot): Faq {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
        } as Faq
    },
    toFirestore(data: Faq) {
        return data
    },
}

export const jobPostConverter: FirestoreDataConverter<JobPost> = {
    fromFirestore(snapshot): JobPost {
        const data = snapshot.data()
        return data as JobPost
    },
    toFirestore(data: JobPost) {
        return data
    },
}

export const ticketConverter: FirestoreDataConverter<Ticket> = {
    fromFirestore(snapshot): Ticket {
        const data = snapshot.data()

        const startDate = data.startDate
            ? typeof data.startDate === 'string'
                ? DateTime.fromISO(data.startDate)
                : data.startDate instanceof Timestamp
                ? DateTime.fromJSDate(data.startDate.toDate())
                : DateTime.fromJSDate(data.startDate?.toDate?.())
            : null

        const endDate = data.endDate
            ? typeof data.endDate === 'string'
                ? DateTime.fromISO(data.endDate)
                : data.endDate instanceof Timestamp
                ? DateTime.fromJSDate(data.endDate.toDate())
                : DateTime.fromJSDate(data.endDate?.toDate?.())
            : null

        return {
            ...(data as Ticket),
            startDate,
            endDate,
        }
    },
    toFirestore(ticket: Ticket) {
        const startDate = ticket.startDate
            ? DateTime.isDateTime(ticket.startDate)
                ? Timestamp.fromDate(ticket.startDate.toJSDate())
                : ticket.startDate
            : null

        const endDate = ticket.endDate
            ? DateTime.isDateTime(ticket.endDate)
                ? Timestamp.fromDate(ticket.endDate.toJSDate())
                : ticket.endDate
            : null

        return {
            ...ticket,
            startDate,
            endDate,
        }
    },
}

export const adminUserConverter: FirestoreDataConverter<{ id: string }> = {
    fromFirestore(snapshot): { id: string } {
        const data = snapshot.data()

        return {
            id: snapshot.id,
            ...data,
        }
    },
    toFirestore(data: any) {
        return data
    },
}
