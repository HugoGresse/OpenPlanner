import { ReactNode } from 'react'
import { Link } from '@mui/material'

export interface FeatureImage {
    src: string
    alt: string
}

export interface FeatureSectionContent {
    key: string
    title: string
    tagline: string
    bullets: ReactNode[]
    images?: FeatureImage[]
}

const ExternalLink = ({ href, children }: { href: string; children: ReactNode }) => (
    <Link href={href} target="_blank" rel="noopener">
        {children}
    </Link>
)

export const FEATURE_SECTIONS: FeatureSectionContent[] = [
    {
        key: 'schedule',
        title: 'A real schedule builder',
        tagline: 'Drag, drop, done — your program takes shape in minutes.',
        bullets: [
            'Calendar view per day with your tracks and rooms side by side',
            'Formats with durations, categories with colors — sessions snap into place',
            'Schedule templates to prepare the grid before talks are picked',
            'Updated in realtime for every organizer, exportable as PDF',
        ],
        images: [
            {
                src: '/features/schedule.png',
                alt: 'The OpenPlanner schedule calendar with sessions across three tracks',
            },
        ],
    },
    {
        key: 'sessions',
        title: 'Sessions, from CFP to stage',
        tagline: 'Import accepted talks or add your own.',
        bullets: [
            <>
                Pick accepted talks from <ExternalLink href="https://conference-hall.io/">ConferenceHall</ExternalLink>{' '}
                without overwriting its data
            </>,
            'Filter, bulk-edit, and export sessions any way you need',
            'Categories, formats, languages, levels, private notes',
            <>
                AI-assisted teasing posts and session visuals generated with{' '}
                <ExternalLink href="https://shortvid.io/">ShortVid</ExternalLink>
            </>,
        ],
        images: [{ src: '/features/sessions.png', alt: 'The sessions list with filters and quick actions' }],
    },
    {
        key: 'speakers',
        title: 'Speakers who manage themselves',
        tagline: 'Profiles, photos, socials — and a magic self-edit link.',
        bullets: [
            'Speaker profiles with photo, company, socials and private contact info',
            'Self-edit via a magic link: speakers update their own bio and photo',
            'Every change goes through admin approval before it is published',
            'Sessions linked automatically, visible at a glance',
        ],
        images: [{ src: '/features/speakers.png', alt: 'The speakers list with linked sessions' }],
    },
    {
        key: 'sponsors',
        title: 'Sponsors and a public job board',
        tagline: 'Categories, logos, and job posts your sponsors submit themselves.',
        bullets: [
            'Sponsor categories with drag-and-drop ordering',
            'Each sponsor gets a private token to submit job offers',
            'You approve job posts before they reach the public site',
            'Everything ships in the exported JSON for your website',
        ],
        images: [{ src: '/features/sponsors.png', alt: 'Sponsor categories with logos' }],
    },
    {
        key: 'team',
        title: 'Your team, on the website',
        tagline: 'The people behind the event, grouped and ordered.',
        bullets: [
            'Team members with photos, roles and socials',
            'Multiple teams with drag-and-drop ordering across and within groups',
            'Published in the exported JSON like everything else',
        ],
        images: [{ src: '/features/team.png', alt: 'The team management page' }],
    },
    {
        key: 'tickets',
        title: 'Tickets without the spreadsheet',
        tagline: 'Tiers, prices, availability — ready for your site.',
        bullets: [
            'Ticket tiers with price, currency, quantity and sale dates',
            'Highlight a tier, flag sold out, add a custom message',
            'Optional newsletter opt-in per tier, all exported to your website',
        ],
        images: [{ src: '/features/tickets.png', alt: 'The tickets management page' }],
    },
    {
        key: 'blocks',
        title: 'Building blocks for your website',
        tagline: 'Describe any custom content — your site renders it.',
        bullets: [
            'Markdown, images, links/CTAs or raw JSON, organized by page and group',
            'Single values, ordered lists, or keyed maps — your choice per block',
            'Multi-image drop upload, live preview, enable/disable per block',
            'Exported as blocks.<page>.<key> in the same JSON as the rest',
        ],
        images: [{ src: '/features/blocks.png', alt: 'The building blocks editor' }],
    },
    {
        key: 'faq',
        title: 'FAQ, public or private',
        tagline: 'One editor, two audiences.',
        bullets: [
            'Categories with drag-and-drop questions and markdown answers',
            'Public pages for attendees, private links for speakers or staff',
            'Share a whole category with a single URL, export as PDF',
        ],
        images: [{ src: '/features/faq.png', alt: 'The FAQ editor with categories' }],
    },
    {
        key: 'live',
        title: 'Run the live show',
        tagline: 'Day-of tooling built from running real conferences.',
        bullets: [
            <>
                Live transcription and on-screen subtitles powered by{' '}
                <ExternalLink href="https://www.gladia.io/">Gladia</ExternalLink>
            </>,
            'Intermission screens between talks: next-session lower third, sponsor and media slideshow, driven by your schedule',
            'WhatsApp track management: poll each room "ready?", broadcast the GO, auto-remind on timing',
            'These screens run in any browser — no login needed in the room',
        ],
        images: [
            {
                src: '/features/intermission-1.jpg',
                alt: 'Intermission screen at Sunny Tech with the next-session lower third',
            },
            {
                src: '/features/intermission-2.jpg',
                alt: 'Intermission screen rotating through the sponsor slideshow',
            },
        ],
    },
    {
        key: 'publish',
        title: 'Publish anywhere',
        tagline: 'Your data, one JSON, any website.',
        bullets: [
            <>
                One click deploys a static JSON with sessions, speakers, sponsors, team, FAQ, tickets and blocks —{' '}
                <ExternalLink href="https://storage.googleapis.com/conferencecenterr.appspot.com/events/YFlN9koUK0qPuYkvbqQg/1f8cd1c0-b0ed-4f24-811d-d8b64718ea29.json">
                    see Sunny Tech 2026&apos;s real JSON
                </ExternalLink>
            </>,
            'Webhooks trigger your website build (GitHub repository_dispatch supported out of the box)',
            'Built-in public schedule site if you do not want to build one',
            <>
                OpenFeedback and Voxxrin exports, plus a full{' '}
                <ExternalLink href="https://api.openplanner.fr/">REST API</ExternalLink> with per-event keys
            </>,
        ],
    },
]
