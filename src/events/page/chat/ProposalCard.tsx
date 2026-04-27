import * as React from 'react'
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { ProposalEntry } from './types'

export type ProposalCardProps = {
    entry: ProposalEntry
    onApply: (id: string) => void
    onReject: (id: string) => void
}

const labelForKind: Record<ProposalEntry['proposal']['kind'], string> = {
    patchSpeaker: 'Update speaker',
    patchSession: 'Update session',
    patchEvent: 'Update event',
    deleteSpeaker: 'Delete speaker',
}

const renderValue = (value: unknown) => {
    if (value === null) return <em>null</em>
    if (value === undefined) return <em>—</em>
    if (typeof value === 'string') return value || <em>(empty)</em>
    return <code style={{ fontSize: '0.75rem' }}>{JSON.stringify(value)}</code>
}

export const ProposalCard = ({ entry, onApply, onReject }: ProposalCardProps) => {
    const { proposal, status, error } = entry
    const isDelete = proposal.kind === 'deleteSpeaker'
    const beforeKeys = Object.keys(proposal.diff.before ?? {})
    const afterKeys = Object.keys(proposal.diff.after ?? {})
    const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]))

    return (
        <Paper variant="outlined" sx={{ borderColor: isDelete ? 'error.main' : 'warning.main', p: 1.5, my: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Chip size="small" label={labelForKind[proposal.kind]} color={isDelete ? 'error' : 'warning'} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {proposal.target.label || proposal.target.id}
                </Typography>
            </Stack>
            {proposal.summary && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                    Reason (from assistant): {proposal.summary}
                </Typography>
            )}

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr 1fr',
                    columnGap: 1,
                    rowGap: 0.5,
                    fontSize: '0.85rem',
                    mb: 1.5,
                }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    field
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    before
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    after
                </Typography>
                {isDelete ? (
                    <>
                        <Typography variant="caption">document</Typography>
                        <Typography variant="caption" component="div">
                            {renderValue(proposal.diff.before)}
                        </Typography>
                        <Typography variant="caption" component="div" color="error">
                            (deleted)
                        </Typography>
                    </>
                ) : (
                    allKeys.map((k) => (
                        <React.Fragment key={k}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                {k}
                            </Typography>
                            <Typography variant="caption" component="div" color="text.secondary">
                                {renderValue((proposal.diff.before as any)?.[k])}
                            </Typography>
                            <Typography variant="caption" component="div">
                                {renderValue((proposal.diff.after as any)?.[k])}
                            </Typography>
                        </React.Fragment>
                    ))
                )}
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                </Alert>
            )}

            {status === 'pending' && (
                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="contained"
                        color={isDelete ? 'error' : 'primary'}
                        startIcon={<CheckIcon />}
                        onClick={() => onApply(entry.id)}>
                        {isDelete ? 'Confirm delete' : 'Apply'}
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CloseIcon />}
                        onClick={() => onReject(entry.id)}>
                        Reject
                    </Button>
                </Stack>
            )}
            {status === 'applying' && (
                <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} />
                    <Typography variant="caption">Applying…</Typography>
                </Stack>
            )}
            {status === 'applied' && (
                <Alert severity="success" sx={{ py: 0 }}>
                    Applied
                </Alert>
            )}
            {status === 'rejected' && (
                <Alert severity="info" sx={{ py: 0 }}>
                    Rejected
                </Alert>
            )}
            {status === 'failed' && (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => onApply(entry.id)}>
                        Retry
                    </Button>
                </Stack>
            )}
        </Paper>
    )
}
