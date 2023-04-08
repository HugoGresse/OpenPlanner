import * as React from 'react'
import { useState } from 'react'
import { Box, Button, Tooltip } from '@mui/material'
import { OpenInBrowser, Refresh } from '@mui/icons-material'

export type UpdateImageProps = {
    src: string
}
export const UpdateImage = ({ src }: UpdateImageProps) => {
    const [cacheDate, setCacheDate] = useState(Date.now())

    if (!src) {
        return null
    }

    return (
        <Tooltip
            title={
                <Box sx={{ '> *': { marginLeft: 1 } }}>
                    <Button
                        onClick={() => setCacheDate(Date.now())}
                        variant="contained"
                        size="small"
                        endIcon={<Refresh />}>
                        Update status
                    </Button>
                    <Button
                        href="https://google.com"
                        target="_blank"
                        variant="contained"
                        size="small"
                        endIcon={<OpenInBrowser />}>
                        Open
                    </Button>
                </Box>
            }>
            <img src={src + '?t=' + cacheDate} />
        </Tooltip>
    )
}
