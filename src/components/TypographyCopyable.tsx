import * as React from 'react'
import { useState } from 'react'
import { ClickAwayListener, Tooltip, Typography, TypographyProps, useTheme, Box } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

export type TypographyCopyableProps = {
    children: string
    singleLine?: boolean
} & TypographyProps

export const TypographyCopyable = ({
    children,
    component,
    singleLine = false,
    ...otherProps
}: TypographyCopyableProps) => {
    const theme = useTheme()
    const [copied, setCopied] = useState(false)

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await navigator.clipboard.writeText(children)
        setCopied(true)
    }

    const handleOpenUrl = (e: React.MouseEvent) => {
        e.stopPropagation()
        window.open(children, '_blank')
    }

    const isValidUrl = (str: string) => {
        try {
            new URL(str)
            return true
        } catch {
            return false
        }
    }

    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                padding: '0.4rem 0.8rem',
                borderRadius: theme.shape.borderRadius,
                border: `1px solid ${theme.palette.divider}`,
                maxWidth: '100%',
                backgroundColor: theme.palette.action.hover,
                transition: theme.transitions.create(['background-color', 'border-color', 'transform'], {
                    duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                    backgroundColor: theme.palette.action.selected,
                    borderColor: theme.palette.action.selected,
                    '& .actionIcon': {
                        opacity: 1,
                    },
                },
            }}>
            <Typography
                variant="caption"
                sx={{
                    wordBreak: singleLine ? 'normal' : 'break-all',
                    whiteSpace: singleLine ? 'nowrap' : 'normal',
                    overflow: singleLine ? 'hidden' : 'visible',
                    textOverflow: singleLine ? 'ellipsis' : 'clip',
                }}
                {...otherProps}>
                {children}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                <ClickAwayListener onClickAway={() => setCopied(false)}>
                    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'} placement="top">
                        <ContentCopyIcon
                            className="actionIcon"
                            onClick={handleCopy}
                            sx={{
                                fontSize: '1rem',
                                opacity: 0.5,
                                transition: theme.transitions.create('opacity'),
                                color: theme.palette.text.secondary,
                                cursor: 'pointer',
                                '&:hover': {
                                    color: theme.palette.primary.main,
                                },
                            }}
                        />
                    </Tooltip>
                </ClickAwayListener>
                {isValidUrl(children) && (
                    <Tooltip title="Open in new tab" placement="top">
                        <OpenInNewIcon
                            className="actionIcon"
                            onClick={handleOpenUrl}
                            sx={{
                                fontSize: '1rem',
                                opacity: 0.5,
                                transition: theme.transitions.create('opacity'),
                                color: theme.palette.text.secondary,
                                cursor: 'pointer',
                                '&:hover': {
                                    color: theme.palette.primary.main,
                                },
                            }}
                        />
                    </Tooltip>
                )}
            </Box>
        </Box>
    )
}
