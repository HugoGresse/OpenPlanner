import { Speaker } from '../../../../types'
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
export const SpeakersStatsDialog = ({
    isOpen,
    onClose,
    speakers,
}: {
    isOpen: boolean
    onClose: () => void
    speakers: Speaker[]
}) => {
    const stats = useMemo(() => {
        return {
            companies: aggregateFields(speakers, 'company'),
            jobTitles: aggregateFields(speakers, 'jobTitle'),
            geolocations: aggregateFields(speakers, 'geolocation'),
        }
    }, [speakers])

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
                </Grid>

                <Button variant="outlined" onClick={onClose}>
                    Close
                </Button>
            </DialogContent>
        </Dialog>
    )
}
