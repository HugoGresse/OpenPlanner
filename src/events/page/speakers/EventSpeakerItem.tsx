import * as React from 'react'
import { Speaker } from '../../../types'
import { Avatar, Button, Grid, Link, Typography } from '@mui/material'
import { Edit } from '@mui/icons-material'

type EventSpeakerItemProps = {
    speaker: Speaker
}

export const EventSpeakerItem = ({ speaker }: EventSpeakerItemProps) => {
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
            <Grid item xs={1}>
                <Avatar src={speaker?.photoUrl || undefined} alt={speaker.name} />
            </Grid>
            <Grid item xs={9}>
                <Typography fontWeight="bold">{speaker.name}</Typography>

                <Typography variant="caption">
                    {speaker.jobTitle} • {speaker.company} •{' '}
                </Typography>
            </Grid>

            <Grid item xs={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Button href={`/speakers/${speaker.id}`} component={Link}>
                    <Edit />
                    Edit
                </Button>
            </Grid>
        </Grid>
    )
}
