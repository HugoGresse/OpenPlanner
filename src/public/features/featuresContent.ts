export interface FeatureSectionContent {
    key: string
    title: string
    tagline: string
    bullets: string[]
    image?: string
    imageAlt?: string
}

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
        image: '/features/schedule.png',
        imageAlt: 'The OpenPlanner schedule calendar with sessions across three tracks',
    },
    {
        key: 'sessions',
        title: 'Sessions, from CFP to stage',
        tagline: 'Import accepted talks from ConferenceHall or add your own.',
        bullets: [
            'Pick talks from ConferenceHall without overwriting its data',
            'Filter, bulk-edit, and export sessions any way you need',
            'Categories, formats, languages, levels, private notes',
            'AI-assisted generation for teasing posts and session media',
        ],
        image: '/features/sessions.png',
        imageAlt: 'The sessions list with filters and quick actions',
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
        image: '/features/speakers.png',
        imageAlt: 'The speakers list with linked sessions',
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
        image: '/features/sponsors.png',
        imageAlt: 'Sponsor categories with logos',
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
        image: '/features/blocks.png',
        imageAlt: 'The building blocks editor',
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
        image: '/features/faq.png',
        imageAlt: 'The FAQ editor with categories',
    },
    {
        key: 'live',
        title: 'Run the live show',
        tagline: 'Day-of tooling built from running real conferences.',
        bullets: [
            'Live transcription and on-screen subtitles powered by Gladia',
            'Intermission screen between talks, driven by your schedule',
            'WhatsApp track management: poll each room "ready?", broadcast the GO, auto-remind on timing',
        ],
    },
    {
        key: 'publish',
        title: 'Publish anywhere',
        tagline: 'Your data, one JSON, any website.',
        bullets: [
            'One click deploys a static JSON with sessions, speakers, sponsors, team, FAQ, tickets and blocks',
            'Webhooks trigger your website build (GitHub repository_dispatch supported out of the box)',
            'Built-in public schedule site if you do not want to build one',
            'OpenFeedback and Voxxrin exports, plus a full REST API with per-event keys',
        ],
    },
]
