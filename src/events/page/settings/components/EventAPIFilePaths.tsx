import * as React from 'react'
import { useEffect, useState } from 'react'
import { Event } from '../../../../types'
import { Box, CircularProgress, Typography } from '@mui/material'
import { getFilesNames } from '../../../actions/updateWebsiteActions/getFilesNames'
import { storageBucket } from '../../../../services/firebase'

export type EventApiFilePathsProps = {
    event: Event
}
export const EventApiFilePaths = ({ event }: EventApiFilePathsProps) => {
    const [filesPath, setFilesPaths] = useState<{ public: null | string; private: null | string }>({
        public: null,
        private: null,
    })

    const update = async () => {
        const files = await getFilesNames(event)

        setFilesPaths({
            public: `https://storage.googleapis.com/${storageBucket}/${files.public}`,
            private: `https://storage.googleapis.com/${storageBucket}/${files.private}`,
        })
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
                API URLs
            </Typography>
            {filesPath.public ? (
                <Box>
                    <Typography>Public (no private information):</Typography>
                    <Typography variant="caption">{filesPath.public}</Typography>
                    <Typography>Private (all private datas, don't share it or put in another website):</Typography>
                    <Typography variant="caption">{filesPath.private}</Typography>
                </Box>
            ) : (
                <CircularProgress />
            )}
        </Box>
    )
}
