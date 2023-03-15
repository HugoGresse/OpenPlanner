import * as React from 'react'
import { Session } from '../../../types'
import { Button, Grid, Link, Typography } from '@mui/material'
import { Edit } from '@mui/icons-material'
import { dateTimeToDayMonthHours } from '../../../utils/timeFormats'

type EventSessionItem = {
    session: Session
}

export const EventSessionItem = ({ session }: EventSessionItem) => {
    return (
        <Grid
            container
            sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 1,
                marginBottom: 1,
                borderBottom: '1px solid #ddd',
            }}>
            <Grid item xs={6}>
                <Typography fontWeight="bold">{session.title}</Typography>

                <Typography variant="caption">
                    by {session.speakersData?.map((s) => s.name).join(', ')} • {session.format} •{' '}
                    {session.tags.length ? 'tags: ' + session.tags.join(', ') : ''}
                </Typography>
            </Grid>

            <Grid item>
                <Typography variant="caption">
                    {dateTimeToDayMonthHours(session.dates?.start) +
                        ' • ' +
                        dateTimeToDayMonthHours(session.dates?.end)}{' '}
                    <br />
                    {session.durationMinutes ? `${session.durationMinutes} minutes` : 'no set'}
                </Typography>
            </Grid>

            <Grid item xs={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Button href={`/sessions/${session.id}`} component={Link}>
                    <Edit />
                    Edit
                </Button>
            </Grid>
        </Grid>
    )
}
