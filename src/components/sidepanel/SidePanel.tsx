import { Box, Drawer, IconButton, Typography } from '@mui/material'
import * as React from 'react'
import CloseIcon from '@mui/icons-material/Close'

export type SidePanelProps = {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    containerProps?: {}
}

export const SidePanel = ({ isOpen, onClose, title, children, containerProps }: SidePanelProps) => {
    return (
        <Drawer
            anchor="right"
            open={isOpen}
            onClose={onClose}
            sx={{
                zIndex: 1500,
            }}
            {...containerProps}>
            <Box
                margin={1}
                sx={{
                    maxWidth: 300,
                    minWidth: 380,
                    padding: 2,
                    height: 'auto',
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                <Box justifyContent="flex-end" marginBottom={2} display="flex" flex={1}>
                    <IconButton aria-label="Close the side panel" onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Typography variant="h6">{title}</Typography>
                {children}
            </Box>
        </Drawer>
    )
}
