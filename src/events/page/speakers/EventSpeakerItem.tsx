import * as React from 'react'
import { Session, Speaker } from '../../../types'
import { Avatar, Button, Chip, Grid, Link, Typography } from '@mui/material'
import { Edit } from '@mui/icons-material'

type EventSpeakerItemProps = {
    speaker: Speaker
    sessions: Session[]
}

export const EventSpeakerItem = ({ speaker, sessions }: EventSpeakerItemProps) => {
    return (
        <Grid
            container
            spacing={2}
            sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingY: 1,
                borderBottom: '1px solid #ddd',
            }}>
            <Grid item xs={2} md={1}>
                <Avatar src={speaker?.photoUrl || undefined} alt={speaker.name} />
            </Grid>
            <Grid item xs={10} md={4}>
                <Typography fontWeight="bold">{speaker.name}</Typography>

                <Typography variant="caption">
                    {speaker.jobTitle} • {speaker.company} •{' '}
                </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
                {sessions.reduce<React.ReactNode[]>((acc, session) => {
                    if (session.speakers.includes(speaker.id)) {
                        acc.push(
                            <Chip
                                label={session.title}
                                component={Link}
                                href={`/sessions/${session.id}?backTo=Speakers`}
                                sx={{ cursor: 'pointer', marginBottom: 1 }}
                            />
                        )
                    }

                    return acc
                }, [])}
            </Grid>

            <Grid item xs={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Button href={`/speakers/${speaker.id}`} component={Link}>
                    <Edit />
                    Edit
                </Button>
            </Grid>
        </Grid>
    )
}
