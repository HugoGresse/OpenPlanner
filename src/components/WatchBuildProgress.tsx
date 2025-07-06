import React, { useEffect, useState, useMemo } from 'react'
import { Box, Chip, LinearProgress, Typography, Alert, AlertTitle } from '@mui/material'
import { CheckCircle, Error as ErrorIcon, Pause, Schedule, Build } from '@mui/icons-material'
import { useGitHubActions } from '../hooks/useGitHubActions'

export type BuildStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'skipped'

export type BuildStep = {
    id: string
    name: string
    status: BuildStatus
    conclusion?: string
    started_at?: string
    completed_at?: string
    duration?: number
}

export type BuildJob = {
    id: number
    name: string
    status: BuildStatus
    conclusion?: string
    started_at?: string
    completed_at?: string
    duration?: number
    steps: BuildStep[]
}

export type WatchBuildProgressProps = {
    repoUrl: string
    branch?: string
    token?: string
    refreshInterval?: number
    timeout?: number
}

const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    try {
        const urlObj = new URL(url)
        if (urlObj.hostname !== 'github.com') return null
        const pathParts = urlObj.pathname.split('/').filter(Boolean)
        if (pathParts.length < 2) return null
        return {
            owner: pathParts[0],
            repo: pathParts[1],
        }
    } catch {
        return null
    }
}

const getStatusColor = (status: BuildStatus, conclusion?: string) => {
    switch (status) {
        case 'completed':
            return conclusion === 'success' ? 'success' : 'error'
        case 'in_progress':
            return 'primary'
        case 'queued':
            return 'warning'
        case 'failed':
            return 'error'
        case 'cancelled':
            return 'default'
        case 'skipped':
            return 'default'
        default:
            return 'default'
    }
}

const getStatusIcon = (status: BuildStatus, conclusion?: string) => {
    switch (status) {
        case 'completed':
            return conclusion === 'success' ? <CheckCircle /> : <ErrorIcon />
        case 'in_progress':
            return <Build />
        case 'queued':
            return <Schedule />
        case 'failed':
            return <ErrorIcon />
        case 'cancelled':
            return <Pause />
        case 'skipped':
            return <Schedule />
        default:
            return <Schedule />
    }
}

const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
}

const formatTimestamp = (timestamp: string): string => {
    const date = new Date(Date.parse(timestamp))
    return date.toLocaleString()
}

const calculateCurrentDuration = (startedAt?: string): number | undefined => {
    if (!startedAt) return undefined
    return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
}

export const WatchBuildProgress: React.FC<WatchBuildProgressProps> = ({
    repoUrl,
    branch,
    token,
    refreshInterval = 5000,
    timeout = 180000,
}) => {
    const [isWatching, setIsWatching] = useState(false)
    const [timeoutReached, setTimeoutReached] = useState(false)

    const parsedRepo = useMemo(() => parseGitHubUrl(repoUrl), [repoUrl])
    const owner = parsedRepo?.owner
    const repository = parsedRepo?.repo

    const { workflowRun, loading, error, lastRefresh } = useGitHubActions({
        owner: owner || '',
        repo: repository || '',
        branch,
        token,
        autoRefresh: !timeoutReached,
        refreshInterval,
    })

    useEffect(() => {
        if (!workflowRun) return
        if (workflowRun.status === 'completed' || workflowRun.status === 'failed' || workflowRun.status === 'cancelled')
            return
        if (timeoutReached) return

        setIsWatching(true)

        // Set timeout to stop watching
        let timeoutId: NodeJS.Timeout | undefined
        if (timeout) {
            timeoutId = setTimeout(() => {
                setIsWatching(false)
                setTimeoutReached(true)
            }, timeout)
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId)
            setIsWatching(false)
        }
    }, [workflowRun, timeout, timeoutReached])

    const status = workflowRun?.status || 'queued'
    const conclusion = workflowRun?.conclusion

    // Calculate current workflow duration
    const currentWorkflowDuration = workflowRun?.run_started_at
        ? calculateCurrentDuration(workflowRun.run_started_at)
        : undefined

    const isWorkflowRunningOrPending = status === 'in_progress' || status === 'queued'

    return (
        <Box>
            <Box display="flex" alignItems="center" mb={2} mx={1}>
                <Chip
                    icon={getStatusIcon(status, conclusion)}
                    label={
                        status.replace('_', ' ') +
                        (currentWorkflowDuration && isWorkflowRunningOrPending
                            ? ` (${formatDuration(currentWorkflowDuration)})`
                            : '')
                    }
                    color={getStatusColor(status, conclusion) as any}
                    variant="outlined"
                />
                {isWatching && (
                    <Box
                        sx={{
                            marginLeft: 1,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'success.main',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                                '0%': { opacity: 1 },
                                '50%': { opacity: 0.2 },
                                '100%': { opacity: 1 },
                            },
                        }}
                    />
                )}
            </Box>
        </Box>
    )
}
