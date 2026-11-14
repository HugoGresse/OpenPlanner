import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useCopyToClipboard } from '../context/copyToClipboardHook'

export type CodeSnippetProps = {
    code: string
    label?: string
}

export const CodeSnippet = ({ code, label }: CodeSnippetProps) => {
    const copy = useCopyToClipboard()

    return (
        <Box sx={{ mt: 1 }}>
            {label && (
                <Typography variant="caption" color="text.secondary">
                    {label}
                </Typography>
            )}
            <Box
                sx={{
                    position: 'relative',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'action.hover',
                }}>
                <Box
                    component="pre"
                    sx={{ m: 0, p: 1.5, pr: 6, overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {code}
                </Box>
                <Tooltip title="Copy" placement="top">
                    <IconButton
                        size="small"
                        aria-label="Copy to clipboard"
                        onClick={() => copy(code)}
                        sx={{ position: 'absolute', top: 4, right: 4 }}>
                        <ContentCopyIcon fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    )
}
