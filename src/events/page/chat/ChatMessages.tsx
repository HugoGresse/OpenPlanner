import * as React from 'react'
import { Box, Chip, Paper, Typography } from '@mui/material'
import { ChatTurn } from './useChatStream'

export type ChatMessagesProps = {
    turns: ChatTurn[]
    streaming: boolean
}

export const ChatMessages = ({ turns, streaming }: ChatMessagesProps) => {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [turns])

    return (
        <Box
            ref={scrollRef}
            sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {turns.map((turn, idx) => (
                <Paper
                    key={idx}
                    elevation={0}
                    sx={{
                        alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        bgcolor: turn.role === 'user' ? 'primary.main' : 'grey.100',
                        color: turn.role === 'user' ? 'primary.contrastText' : 'text.primary',
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
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {turn.content ||
                            (turn.role === 'assistant' && streaming && idx === turns.length - 1 ? '…' : '')}
                    </Typography>
                </Paper>
            ))}
        </Box>
    )
}
