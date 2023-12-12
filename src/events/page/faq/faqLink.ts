import { Event } from '../../../types'

export const getFaqCategoryPrivateLink = (event: Event, publicCategoryId: string) => {
    const base = getFaqBaseLinkLink(event)

    return `${base}${publicCategoryId}`
}

export const getFaqBaseLinkLink = (event: Event) => {
    const port = window.location.port
    const domainName = window.location.hostname + (port ? `:${port}` : '')
    const protocol = window.location.protocol

    return `${protocol}//${domainName}/public/event/${event.id}/faq/`
}
