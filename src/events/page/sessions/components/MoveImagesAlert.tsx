import { Alert, Button, Typography } from '@mui/material'
import * as React from 'react'
import { useMoveAllImagesToOpenPlannerStorage } from '../../../actions/speakers/useMoveAllImagesToOpenPlannerStorage'
import { Event, Session } from '../../../../types'

export const MoveImagesAlert = ({ event, sessionsData }: { event: Event; sessionsData: Session[] }) => {
    const moveAllImagesToOpenPlannerStorageState = useMoveAllImagesToOpenPlannerStorage(event, sessionsData)

    return (
        <>
            {moveAllImagesToOpenPlannerStorageState.shouldUpdateImageStorage && (
                <Alert variant="filled" severity="info" sx={{ marginBottom: 2 }}>
                    {moveAllImagesToOpenPlannerStorageState.total} session/speaker images are NOT stored in OpenPlanner.
                    This may cause issues due to the image not being accessible in some code (ShortVid.io) or being
                    moved later and making it unavailable in the long term.
                    <br />
                    You can migrate the images to OpenPlanner at once now:
                    <Button
                        variant="contained"
                        color="secondary"
                        disabled={moveAllImagesToOpenPlannerStorageState.isLoading}
                        onClick={() => {
                            moveAllImagesToOpenPlannerStorageState.moveAllImagesToOpenPlannerStorage()
                        }}>
                        Migrate images{' '}
                        {moveAllImagesToOpenPlannerStorageState.isLoading
                            ? `${moveAllImagesToOpenPlannerStorageState.progress}/${moveAllImagesToOpenPlannerStorageState.total}`
                            : ''}
                    </Button>
                    {moveAllImagesToOpenPlannerStorageState.error.length > 0 && (
                        <>
                            <Typography>Error(s):</Typography>
                            <ul>
                                {moveAllImagesToOpenPlannerStorageState.error.map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        </>
                    )}
                </Alert>
            )}
        </>
    )
}
