import * as React from 'react'
import { useEffect, useState } from 'react'
import { Event } from '../../../../types'
import { Box, CircularProgress, Typography } from '@mui/material'
import { getUploadFilePathFromEvent } from '../../../actions/updateWebsiteActions/getFilesNames'
import { TypographyCopyable } from '../../../../components/TypographyCopyable'

export type EventApiFilePathsProps = {
    event: Event
}
export const EventStaticApiFilePaths = ({ event }: EventApiFilePathsProps) => {
    const [filesPath, setFilesPaths] = useState<{
        public: null | string
        private: null | string
        openfeedback: null | string
    }>({
        public: null,
        private: null,
        openfeedback: null,
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
                    <Typography>Public (no private information):</Typography>
                    <TypographyCopyable>{filesPath.public}</TypographyCopyable>
                    <Typography>Private (all private datas, don't share it or put in another website):</Typography>
                    {filesPath.private && <TypographyCopyable>{filesPath.private}</TypographyCopyable>}
                    <Typography>OpenFeedback.io:</Typography>
                    {filesPath.openfeedback && <TypographyCopyable>{filesPath.openfeedback}</TypographyCopyable>}

                    <Box bgcolor={'#88888888'} p={1} mt={2} borderRadius={1}>
                        <Typography>
                            You may want to add a cache busting param to the url to force refresh the cache:
                            "?t=Date.now()"
                        </Typography>
                    </Box>
                </Box>
            ) : (
                <CircularProgress />
            )}
        </Box>
    )
}
