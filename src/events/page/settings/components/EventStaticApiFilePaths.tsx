import { useEffect, useState } from 'react'
import { Event } from '../../../../types'
import { Box, CircularProgress, FormControlLabel, Switch, Typography } from '@mui/material'
import { getUploadFilePathFromEvent } from '../../../actions/updateWebsiteActions/getFilesNames'
import { TypographyCopyable } from '../../../../components/TypographyCopyable'
import { collections } from '../../../../services/firebase'
import { doc } from 'firebase/firestore'
import { useFirestoreDocumentMutation } from '../../../../services/hooks/firestoreMutationHooks'

export type EventApiFilePathsProps = {
    event: Event
}
export const EventStaticApiFilePaths = ({ event }: EventApiFilePathsProps) => {
    const eventMutation = useFirestoreDocumentMutation(doc(collections.events, event.id))
    const [filesPath, setFilesPaths] = useState<{
        public: null | string
        private: null | string
        openfeedback: null | string
        voxxrin: null | string
    }>({
        public: null,
        private: null,
        openfeedback: null,
        voxxrin: null,
    })

    const update = async () => {
        const filesPaths = await getUploadFilePathFromEvent(event)
        setFilesPaths(filesPaths)
    }

    useEffect(() => {
        if (event.files) {
            update()
        }
    }, [event])

    if (!event.files) {
        return (
            <Box>
                <Typography fontWeight="600" mt={2}>
                    API URLs
                </Typography>
                <Typography>Run "Update website" once to get API File Paths</Typography>
            </Box>
        )
    }

    return (
        <Box>
            <Typography fontWeight="600" mt={2}>
                Static APIs (very fast, cached, read only)
            </Typography>
            {filesPath.public ? (
                <Box>
                    <Typography sx={{ mt: 2 }}>Public (no private information):</Typography>
                    <TypographyCopyable>{filesPath.public}</TypographyCopyable>
                    <Typography sx={{ mt: 2 }}>
                        Private (all private datas, don't share it or put in another website):
                    </Typography>
                    {filesPath.private && <TypographyCopyable>{filesPath.private}</TypographyCopyable>}
                    <Typography sx={{ mt: 2 }}>OpenFeedback.io:</Typography>
                    {filesPath.openfeedback && <TypographyCopyable>{filesPath.openfeedback}</TypographyCopyable>}
                    {filesPath.voxxrin ? (
                        <>
                            <Typography sx={{ mt: 2 }}>Voxxrin:</Typography>
                            <TypographyCopyable>{filesPath.voxxrin}</TypographyCopyable>
                        </>
                    ) : (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={event.enableVoxxrin}
                                    onChange={(e) => {
                                        eventMutation.mutate({ enableVoxxrin: e.target.checked })
                                    }}
                                />
                            }
                            label="Enable Voxxrin"
                        />
                    )}

                    <Box bgcolor={'#88888888'} p={1} mt={2} borderRadius={1}>
                        <Typography>
                            You may want to add a cache busting param to the url to force refresh the cache:
                            "?t=Date.now()". The <b>Static API</b> is updated only when you press "Update website".
                        </Typography>
                    </Box>
                </Box>
            ) : (
                <CircularProgress />
            )}
        </Box>
    )
}
