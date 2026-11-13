import { useEffect, useState } from 'react'
import { Box, Chip, Stack, Typography } from '@mui/material'
import { DateTime } from 'luxon'

export type TalkInfoProps = {
    trackName: string
    talkTitle: string
    dateStart: string
    dateEnd: string
    nextTalkTitle?: string
}

const hhmm = (iso: string) => DateTime.fromISO(iso).toFormat('HH:mm')

// Live relative timing for the current talk: counts down to its start, shows minutes remaining while
// it's running, or how long ago it ended — with a colour cue for each state.
const relativeTiming = (start: DateTime, end: DateTime, now: DateTime): { label: string; color: string } => {
    if (now < start) {
        return { label: `starts in ${Math.ceil(start.diff(now, 'minutes').minutes)} min`, color: '#8ab4ff' }
    }
    if (now <= end) {
        return { label: `${Math.max(0, Math.ceil(end.diff(now, 'minutes').minutes))} min left`, color: '#5bd75b' }
    }
    return { label: `ended ${Math.floor(now.diff(end, 'minutes').minutes)} min ago`, color: '#ff8a8a' }
}

// Presentational info block (track, talk, timings) — positioning and action buttons are owned by the
// shared bottom bar in LiveTranscriptionView.
export const TalkInfo = ({ trackName, talkTitle, dateStart, dateEnd, nextTalkTitle }: TalkInfoProps) => {
    const [, setTick] = useState(0)
    // Re-render every 30s so the relative timing stays fresh without a faster clock.
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 30_000)
        return () => clearInterval(id)
    }, [])

    const start = DateTime.fromISO(dateStart)
    const end = DateTime.fromISO(dateEnd)
    const durationMin = Math.round(end.diff(start, 'minutes').minutes)
    const timing = relativeTiming(start, end, DateTime.now())

    return (
        <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            useFlexGap
            flexWrap="wrap"
            sx={{ minWidth: 0, flex: 1 }}>
            <Chip label={trackName} size="small" sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 18, minWidth: 0 }} noWrap title={talkTitle}>
                {talkTitle}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 0.75,
                        px: 1.25,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.25)',
                    }}>
                    <Typography
                        sx={{ fontWeight: 800, fontSize: 26, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                        {hhmm(dateStart)}–{hhmm(dateEnd)}
                    </Typography>
                    <Typography sx={{ opacity: 0.6, fontSize: 13 }}>{durationMin} min</Typography>
                </Box>
                <Chip
                    label={timing.label}
                    size="small"
                    sx={{
                        bgcolor: 'transparent',
                        color: timing.color,
                        border: `1px solid ${timing.color}`,
                        fontWeight: 600,
                    }}
                />
            </Stack>

            {nextTalkTitle && (
                <Box sx={{ opacity: 0.65, fontSize: 13, minWidth: 0 }}>
                    <Typography component="span" sx={{ fontSize: 13 }} noWrap title={nextTalkTitle}>
                        Next: {nextTalkTitle}
                    </Typography>
                </Box>
            )}
        </Stack>
    )
}
