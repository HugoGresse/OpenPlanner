import { Speaker, Event } from '../../../../types'
import { Button, Dialog, DialogContent, Grid, Typography } from '@mui/material'
import * as React from 'react'
import { useMemo } from 'react'

const aggregateFields = <K extends keyof Speaker>(speakers: Speaker[], field: K) => {
    const aggregate = speakers.reduce((acc: Record<string, number>, speaker) => {
        const key = speaker[field] ? String(speaker[field]) : 'N/A'
        if (key) {
            acc[key] = acc[key] ? acc[key] + 1 : 1
        }
        return acc
    }, {})

    return Object.entries(aggregate)
        .map(([key, value]) => ({
            key,
            value,
        }))
        .sort((a, b) => b.value - a.value)
}

const getSpeakersWithMultipleTalks = (
    speakers: Speaker[],
    sessions: { speakers: string[]; format: string | null }[]
) => {
    const speakerTalkCount = sessions.reduce(
        (acc: Record<string, { count: number; formats: Record<string, number> }>, session) => {
            session.speakers.forEach((speakerId) => {
                if (!acc[speakerId]) {
                    acc[speakerId] = { count: 0, formats: {} }
                }
                acc[speakerId].count++
                if (session.format) {
                    acc[speakerId].formats[session.format] = (acc[speakerId].formats[session.format] || 0) + 1
                }
            })
            return acc
        },
        {}
    )

    return Object.entries(speakerTalkCount)
        .reduce((acc: (Speaker & { talkCount: number; formats: Record<string, number> })[], [speakerId, data]) => {
            if (data.count > 1) {
                const speaker = speakers.find((s) => s.id === speakerId)
                if (speaker) {
                    acc.push({
                        ...speaker,
                        talkCount: data.count,
                        formats: data.formats,
                    })
                }
            }
            return acc
        }, [])
        .sort((a, b) => b.talkCount - a.talkCount)
}

const getSpeakersWithMostEmojis = (speakers: Speaker[], sessions: { speakers: string[]; title: string }[]) => {
    const speakerEmojiCount = sessions.reduce((acc: Record<string, number>, session) => {
        // Count emojis in the title using a regex that matches emoji characters
        const emojiCount = (session.title.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [])
            .length

        session.speakers.forEach((speakerId) => {
            acc[speakerId] = (acc[speakerId] || 0) + emojiCount
        })
        return acc
    }, {})

    return Object.entries(speakerEmojiCount)
        .reduce((acc: (Speaker & { emojiCount: number })[], [speakerId, count]) => {
            if (count > 0) {
                const speaker = speakers.find((s) => s.id === speakerId)
                if (speaker) {
                    acc.push({
                        ...speaker,
                        emojiCount: count,
                    })
                }
            }
            return acc
        }, [])
        .sort((a, b) => b.emojiCount - a.emojiCount)
}

export const SpeakersStatsDialog = ({
    isOpen,
    onClose,
    speakers,
    sessions,
    event,
}: {
    isOpen: boolean
    onClose: () => void
    speakers: Speaker[]
    sessions: { speakers: string[]; title: string; format: string | null }[]
    event: Event
}) => {
    const stats = useMemo(() => {
        return {
            companies: aggregateFields(speakers, 'company'),
            jobTitles: aggregateFields(speakers, 'jobTitle'),
            geolocations: aggregateFields(speakers, 'geolocation'),
            speakersWithMultipleTalks: getSpeakersWithMultipleTalks(speakers, sessions),
            speakersWithMostEmojis: getSpeakersWithMostEmojis(speakers, sessions),
        }
    }, [speakers, sessions])

    const getFormatName = (formatId: string) => {
        const format = event.formats?.find((f) => f.id === formatId)
        return format ? format.name : formatId
    }

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth={true} scroll="body">
            <DialogContent>
                <Typography variant="h5">Speakers stats</Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6">Companies ({Object.keys(stats.companies).length})</Typography>

                        <ul>
                            {stats.companies.map((company) => (
                                <li key={company.key}>
                                    {company.key} ({company.value})
                                </li>
                            ))}
                        </ul>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6">Speakers with multiple sessions</Typography>
                        <ul>
                            {stats.speakersWithMultipleTalks.map((speaker) => (
                                <li key={speaker.id}>
                                    {speaker.name} ({speaker.talkCount} sessions)
                                    <ul>
                                        {Object.entries(speaker.formats).map(([formatId, count]) => (
                                            <li key={formatId}>
                                                {getFormatName(formatId)}: {count} session{count > 1 ? 's' : ''}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6">Job titles ({Object.keys(stats.jobTitles).length})</Typography>

                        <ul>
                            {stats.jobTitles.map((jobTitle) => (
                                <li key={jobTitle.key}>
                                    {jobTitle.key} ({jobTitle.value})
                                </li>
                            ))}
                        </ul>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6">Geolocations ({Object.keys(stats.geolocations).length})</Typography>

                        <ul>
                            {stats.geolocations.map((geolocation) => (
                                <li key={geolocation.key}>
                                    {geolocation.key} ({geolocation.value})
                                </li>
                            ))}
                        </ul>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6">Speakers with most emojis in session titles</Typography>
                        <ul>
                            {stats.speakersWithMostEmojis.map((speaker) => (
                                <li key={speaker.id}>
                                    {speaker.name} ({speaker.emojiCount} emojis)
                                </li>
                            ))}
                        </ul>
                    </Grid>
                </Grid>

                <Button variant="outlined" onClick={onClose}>
                    Close
                </Button>
            </DialogContent>
        </Dialog>
    )
}
