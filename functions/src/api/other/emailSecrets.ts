import { defineSecret } from 'firebase-functions/params'

// SMTP connection URI for the outbound transactional email transport.
// Stored as a Firebase Functions secret (not a plain env var) because it
// contains the SMTP password. Format follows nodemailer's URL convention:
//   smtps://USER:PASS@HOST:PORT       (port 465, implicit TLS)
//   smtp://USER:PASS@HOST:PORT        (port 587, STARTTLS — set ?secure=false)
// User/password components MUST be URL-encoded (e.g. `@` → `%40`).
//
// Set the secret with:
//   firebase functions:secrets:set MAILGUN_SMTP_URI
export const MAILGUN_SMTP_URI = defineSecret('MAILGUN_SMTP_URI')

// Default "From" header for outgoing mail. Either a bare address
// (`noreply@mg.example.com`) or a name + address pair
// (`OpenPlanner <noreply@mg.example.com>`).
//
//   firebase functions:secrets:set MAIL_FROM
export const MAIL_FROM = defineSecret('MAIL_FROM')

export const emailSecrets = [MAILGUN_SMTP_URI, MAIL_FROM]
