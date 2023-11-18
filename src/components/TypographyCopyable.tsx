import * as React from 'react'
import { useState } from 'react'
import { ClickAwayListener, Tooltip, Typography } from '@mui/material'

export type TypographyCopyableProps = {
    children: string
}
export const TypographyCopyable = ({ children, ...otherProps }: TypographyCopyableProps) => {
    const [open, setOpen] = useState(false)
    const [openHover, setOpenHover] = useState(false)

    const handleTooltipClose = () => {
        setOpen(false)
        setOpenHover(false)
    }

    const handleTooltipOpen = async () => {
        setOpenHover(false)
        await navigator.clipboard.writeText(children)
        setOpen(true)
    }
    return (
        <ClickAwayListener onClickAway={handleTooltipClose}>
            <div>
                <Tooltip
                    title="Copy?"
                    open={openHover}
                    onClose={() => setOpenHover(false)}
                    onOpen={() => setOpenHover(true)}>
                    <div>
                        <Tooltip
                            PopperProps={{
                                disablePortal: true,
                            }}
                            onClose={handleTooltipClose}
                            open={open}
                            disableFocusListener
                            disableHoverListener
                            disableTouchListener
                            title="Copied!">
                            <Typography
                                variant="caption"
                                onClick={handleTooltipOpen}
                                sx={{
                                    padding: '0.2rem',
                                    borderRadius: '0.2rem',
                                    cursor: 'pointer',
                                    wordBreak: 'break-all',
                                    transition: 'background-color 0.2s',
                                    '&:hover': {
                                        backgroundColor: '#88888888',
                                    },
                                }}
                                {...otherProps}>
                                {children}
                            </Typography>
                        </Tooltip>
                    </div>
                </Tooltip>
            </div>
        </ClickAwayListener>
    )
}
