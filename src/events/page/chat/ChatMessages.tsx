import * as React from 'react'
import { Box, Chip, Paper, Typography, useTheme } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import { ChatTurn } from './useChatStream'

export type ChatMessagesProps = {
    turns: ChatTurn[]
    streaming: boolean
}

export const ChatMessages = ({ turns, streaming }: ChatMessagesProps) => {
    const theme = useTheme()
    const scrollRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [turns])

    return (
        <Box
            ref={scrollRef}
            sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {turns.map((turn, idx) => {
                const isUser = turn.role === 'user'
                return (
                    <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            bgcolor: isUser ? 'primary.main' : 'action.hover',
                            color: isUser ? 'primary.contrastText' : 'text.primary',
                            px: 1.5,
                            py: 1,
                            borderRadius: 2,
                        }}>
                        {turn.tools && turn.tools.length > 0 && (
                            <Box sx={{ mb: turn.content ? 1 : 0, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {turn.tools.map((tool) => (
                                    <Chip
                                        key={tool.id}
                                        size="small"
                                        label={`${tool.name}${tool.result === undefined ? '…' : ''}`}
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem' }}
                                    />
                                ))}
                            </Box>
                        )}
                        {isUser ? (
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {turn.content}
                            </Typography>
                        ) : turn.content ? (
                            <Box
                                sx={{
                                    fontSize: theme.typography.body2.fontSize,
                                    lineHeight: theme.typography.body2.lineHeight,
                                    color: 'text.primary',
                                    wordBreak: 'break-word',
                                    '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
                                    '& ul, & ol': { pl: 3, m: 0, mb: 1 },
                                    '& li': { mb: 0.25 },
                                    '& code': {
                                        bgcolor: 'action.selected',
                                        px: 0.5,
                                        py: 0.1,
                                        borderRadius: 0.5,
                                        fontFamily: 'monospace',
                                        fontSize: '0.85em',
                                    },
                                    '& pre': {
                                        bgcolor: 'action.selected',
                                        p: 1,
                                        borderRadius: 1,
                                        overflowX: 'auto',
                                        mb: 1,
                                    },
                                    '& pre code': { bgcolor: 'transparent', p: 0 },
                                    '& a': { color: 'primary.main' },
                                    '& h1, & h2, & h3, & h4': { mt: 1, mb: 0.5, fontWeight: 600 },
                                    '& blockquote': {
                                        borderLeft: '3px solid',
                                        borderColor: 'divider',
                                        pl: 1.5,
                                        ml: 0,
                                        color: 'text.secondary',
                                    },
                                    '& table': { borderCollapse: 'collapse' },
                                    '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1, py: 0.5 },
                                }}>
                                <ReactMarkdown>{turn.content}</ReactMarkdown>
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                {streaming && idx === turns.length - 1 ? '…' : ''}
                            </Typography>
                        )}
                    </Paper>
                )
            })}
        </Box>
    )
}
