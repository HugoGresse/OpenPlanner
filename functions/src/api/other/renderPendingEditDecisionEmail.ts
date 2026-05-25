import { Speaker } from '../../types'

const FIELD_LABELS: Record<string, string> = {
    name: 'Name',
    pronouns: 'Pronouns',
    jobTitle: 'Job title',
    bio: 'Bio',
    company: 'Company',
    companyLogoUrl: 'Company logo',
    geolocation: 'Geolocation',
    photoUrl: 'Photo',
    socials: 'Socials',
    customFields: 'Custom fields',
}

const formatFieldName = (key: string): string => FIELD_LABELS[key] || key

const formatPatchValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '(empty)'
    if (typeof value === 'boolean') return value ? 'yes' : 'no'
    if (Array.isArray(value)) {
        // For socials: list names so the email is human-readable.
        if (value.length === 0) return '(none)'
        const names = value
            .map((item) => (item as { name?: string })?.name)
            .filter((n): n is string => typeof n === 'string')
        if (names.length > 0) return names.join(', ')
        return `${value.length} entries`
    }
    if (typeof value === 'object') {
        const keys = Object.keys(value as object)
        return keys.length > 0 ? keys.join(', ') : '(empty)'
    }
    const str = String(value)
    return str.length > 200 ? `${str.slice(0, 200)}…` : str
}

const renderChangedFieldsList = (patch: Partial<Speaker>): string => {
    const lines: string[] = []
    for (const [key, value] of Object.entries(patch)) {
        lines.push(`- ${formatFieldName(key)}: ${formatPatchValue(value)}`)
    }
    return lines.join('\n')
}

// Same OpenPlanner-attribution footer used by the request-edit-link mail.
// Per-deploy MAIL_FROM domains make the From header alone unreliable for
// the speaker to identify who is writing, so every speaker self-edit
// email carries an explicit "sent by OpenPlanner" line + a real reply-to
// address.
const OPENPLANNER_CONTACT = 'contact@email.openplanner.fr'
const buildFooter = (eventName: string): string =>
    `--\nThis email was sent by OpenPlanner on behalf of "${eventName}". ` +
    `For questions, contact ${OPENPLANNER_CONTACT}.`

export const renderApprovedEmail = (
    speakerName: string,
    eventName: string,
    patch: Partial<Speaker>
): { subject: string; text: string } => {
    const changes = renderChangedFieldsList(patch)
    return {
        subject: `Profile changes approved — ${eventName}`,
        text:
            `Hello ${speakerName},\n\n` +
            `Your profile changes for "${eventName}" have been approved by an administrator and will be public soon.\n\n` +
            `Changes applied:\n${changes}\n\n` +
            `If you did not request these changes, please contact the event organisers.\n\n` +
            buildFooter(eventName),
    }
}

export const renderRejectedEmail = (
    speakerName: string,
    eventName: string,
    patch: Partial<Speaker>,
    reviewNote?: string | null
): { subject: string; text: string } => {
    const changes = renderChangedFieldsList(patch)
    const noteSection = reviewNote ? `\n\nReviewer note:\n${reviewNote}` : ''
    return {
        subject: `Profile changes not applied — ${eventName}`,
        text:
            `Hello ${speakerName},\n\n` +
            `Your recent profile changes for "${eventName}" were not applied by the administrators.\n\n` +
            `Changes you proposed:\n${changes}${noteSection}\n\n` +
            `You can request a fresh edit link from the speaker self-edit page if you want to retry.\n\n` +
            buildFooter(eventName),
    }
}
