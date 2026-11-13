// Single source of truth for the OpenPlanner attribution shown to
// speakers in every self-edit email (magic-link request, approval
// notification, rejection notification). Centralising the constant +
// the footer builder here prevents the wording from drifting across
// templates the next time the contact address or the copy changes.

export const OPENPLANNER_CONTACT_EMAIL = 'contact@email.openplanner.fr'

/**
 * Plain-text attribution footer appended to every speaker-facing email
 * the OpenPlanner backend sends. Per-event MAIL_FROM domains mean the
 * From header alone is not a stable identifier for the speaker — this
 * line tells them which platform is writing AND gives them a real
 * inbox they can reply to (the SMTP Reply-To header is also set
 * server-side; see sendEmail).
 */
export const buildSpeakerEmailFooter = (eventName: string): string =>
    `--\nThis email was sent by OpenPlanner on behalf of "${eventName}". ` +
    `For questions, contact ${OPENPLANNER_CONTACT_EMAIL}.`
