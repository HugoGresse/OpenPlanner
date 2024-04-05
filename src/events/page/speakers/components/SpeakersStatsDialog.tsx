import { Event, Session, Speaker } from '../../../../types'
import { Button, CircularProgress, Dialog, DialogContent, Typography } from '@mui/material'
import * as React from 'react'
import { GenerationStates, useSessionsGeneration } from '../../../actions/sessions/generation/useSessionsGeneration'
import { useMemo, useState } from 'react'

export const SpeakersStatsDialog = ({
    isOpen,
    onClose,
    event,
    speakers,
}: {
    isOpen: boolean
    onClose: () => void
    event: Event
    speakers: Speaker[]
}) => {
    const stats = useMemo(() => {
        return {
            companies: speakers.reduce((acc, speaker) => {
                if (speaker.company) {
                    acc[speaker.company] = acc[speaker.company] ? acc[speaker.company] + 1 : 1
                }
                return acc
            }, {} as Record<string, number>),
            jobTitles: speakers.reduce((acc, speaker) => {
                if (speaker.jobTitle) {
                    acc[speaker.jobTitle] = acc[speaker.jobTitle] ? acc[speaker.jobTitle] + 1 : 1
                }
                return acc
            }, {} as Record<string, number>),
            geolocations: speakers.reduce((acc, speaker) => {
                if (speaker.geolocation) {
                    acc[speaker.geolocation] = acc[speaker.geolocation] ? acc[speaker.geolocation] + 1 : 1
                }
                return acc
            }, {} as Record<string, number>),
        }
    }, [speakers])

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth={true} scroll="body">
            <DialogContent>
                <Typography variant="h5">Speakers stats</Typography>

                <Typography variant="h6">Companies ({Object.keys(stats.companies).length})</Typography>
                <ul>
                    {Object.entries(stats.companies).map(([company, count]) => (
                        <li key={company}>
                            {company} - {count}
                        </li>
                    ))}
                </ul>

                <Typography variant="h6">Job titles ({Object.keys(stats.geolocations).length})</Typography>
                <ul>
                    {Object.entries(stats.jobTitles).map(([jobTitle, count]) => (
                        <li key={jobTitle}>
                            {jobTitle} - {count}
                        </li>
                    ))}
                </ul>

                <Typography variant="h6">Geolocations ({Object.keys(stats.geolocations).length})</Typography>
                <ul>
                    {Object.entries(stats.geolocations).map(([geolocation, count]) => (
                        <li key={geolocation}>
                            {geolocation} - {count}
                        </li>
                    ))}
                </ul>

                <Button variant="outlined" onClick={onClose}>
                    Close
                </Button>
            </DialogContent>
        </Dialog>
    )
}
