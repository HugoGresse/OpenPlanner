import * as React from 'react'
import { Session } from '../../../types'
import { Button, Chip, Grid, Link, Typography, useTheme } from '@mui/material'
import { Edit } from '@mui/icons-material'
import { dateTimeToDayMonthHours } from '../../../utils/dates/timeFormats'

type EventSessionItem = {
    selectFormat: (formatId: string) => void
    session: Session
}

export const EventSessionItem = ({ selectFormat, session }: EventSessionItem) => {
    const theme = useTheme()
    let times = 'No start/end times'

    if (session.dates && session.dates.start) {
        times = dateTimeToDayMonthHours(session.dates.start) + ' • ' + dateTimeToDayMonthHours(session.dates?.end)
    }

    const speakersNames = session.speakersData
        ? session.speakersData.map((s) => (s ? s.name : 'deleted')).join(', ')
        : null

    return (
        <Grid
            container
            spacing={2}
            sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingY: 1,
                borderBottom: `1px solid ${theme.palette.divider}`,
            }}>
            <Grid item sm={12} md={6}>
                <Typography fontWeight="bold">{session.title}</Typography>

                <Typography variant="caption">
                    {speakersNames ? `by ${speakersNames} • ` : ''} {session.categoryObject?.name} •{' '}
                </Typography>
            </Grid>

            <Grid item sm={12} md={2}>
                <Chip
                    label={session.formatText || 'no format'}
                    size="small"
                    onClick={() => selectFormat(session.format || '')}
                />
                {session.tags.length ? 'tags: ' + session.tags.map((t) => <Chip label={t} size="small" />) : ''}
            </Grid>
            <Grid item sm={12} md={3}>
                <Typography variant="caption">
                    {times} <br />
                    {session.durationMinutes ? `${session.durationMinutes} minutes` : 'no set'}
                </Typography>
            </Grid>

            <Grid item sm={12} md={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Button href={`/sessions/${session.id}`} component={Link}>
                    <Edit />
                    Edit
                </Button>
            </Grid>
        </Grid>
    )
}
