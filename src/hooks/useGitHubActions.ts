import { useState, useEffect, useCallback } from 'react'
import { BuildStatus } from '../components/WatchBuildProgress'

export type GitHubWorkflowRun = {
    id: number
    name: string
    status: BuildStatus
    conclusion?: string
    created_at: string
    updated_at: string
    run_started_at?: string
    run_completed_at?: string
    jobs_url: string
    head_branch: string
    head_sha: string
    workflow_id: number
}

export type UseGitHubActionsProps = {
    /** GitHub repository owner (username or organization) */
    owner: string
    /** GitHub repository name */
    repo: string
    /** Branch name. Used to filter runs by branch */
    branch?: string
    /** GitHub API token for authentication */
    token?: string
    /** Whether to automatically refresh the data */
    autoRefresh?: boolean
    /** Refresh interval in milliseconds (default: 5000) */
    refreshInterval?: number
}

export type UseGitHubActionsReturn = {
    workflowRun?: GitHubWorkflowRun
    loading: boolean
    error?: string
    refresh: () => void
    lastRefresh: Date
}

const GITHUB_API_BASE = 'https://api.github.com'

const fetchWithAuth = async (url: string, token?: string) => {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
    }

    if (token) {
        headers['Authorization'] = `token ${token}`
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

const fetchLatestWorkflowRun = async (
    owner: string,
    repo: string,
    branch?: string,
    token?: string
): Promise<GitHubWorkflowRun | null> => {
    try {
        // Fetch latest run for any workflow
        const params = new URLSearchParams({
            per_page: '1',
        })

        if (branch) {
            params.append('branch', branch)
        }

        const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?${params.toString()}`
        const runsData = await fetchWithAuth(url, token)

        if (runsData.workflow_runs.length > 0) {
            return runsData.workflow_runs[0]
        }

        return null
    } catch (error) {
        console.error('Failed to fetch latest workflow run:', error)
        return null
    }
}

/**
 * Hook to fetch and monitor GitHub Actions workflow runs
 * Automatically fetches the latest workflow run and stores its ID to prevent re-fetching.
 * Stops auto-refresh when the workflow is completed, failed, or cancelled.
 *
 * @param props - Configuration for the hook
 * @returns Object containing workflow run data, jobs, loading state, and refresh function
 *
 * @example
 * // Fetch latest workflow run
 * const { workflowRun, jobs, loading } = useGitHubActions({
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   token: 'github-token'
 * })
 *
 * @example
 * // Fetch latest run from specific branch
 * const { workflowRun, jobs, loading } = useGitHubActions({
 *   owner: 'myorg',
 *   repo: 'myrepo',
 *   branch: 'main',
 *   token: 'github-token'
 * })
 */
export const useGitHubActions = ({
    owner,
    repo,
    branch,
    token,
    autoRefresh = true,
    refreshInterval = 5000,
}: UseGitHubActionsProps): UseGitHubActionsReturn => {
    const [workflowRun, setWorkflowRun] = useState<GitHubWorkflowRun>()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>()
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
    const [currentWorkflowRunId, setCurrentWorkflowRunId] = useState<number>()

    const fetchWorkflowRun = useCallback(async () => {
        if (!owner || !repo) return

        try {
            setLoading(true)
            setError(undefined)

            let runData: GitHubWorkflowRun

            if (currentWorkflowRunId) {
                // Use stored workflow run ID
                const runUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${currentWorkflowRunId}`
                runData = await fetchWithAuth(runUrl, token)
            } else {
                // Fetch the latest workflow run
                const latestRun = await fetchLatestWorkflowRun(owner, repo, branch, token)
                if (!latestRun) {
                    setError('No workflow runs found')
                    setLoading(false)
                    return
                }
                runData = latestRun
                setCurrentWorkflowRunId(runData.id)
            }

            setWorkflowRun(runData)

            setLastRefresh(new Date())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch workflow run')
        } finally {
            setLoading(false)
        }
    }, [owner, repo, currentWorkflowRunId, branch, token])

    const refresh = useCallback(() => {
        fetchWorkflowRun()
    }, [fetchWorkflowRun])

    useEffect(() => {
        if (!owner || !repo) return

        fetchWorkflowRun()

        // Stop auto-refresh when workflow is completed, failed, or cancelled
        const isWorkflowCompleted =
            workflowRun?.status === 'completed' ||
            workflowRun?.status === 'failed' ||
            workflowRun?.status === 'cancelled'

        const isWorkflowRunningOrPending = workflowRun?.status === 'in_progress' || workflowRun?.status === 'queued'

        if (autoRefresh && isWorkflowRunningOrPending && !isWorkflowCompleted) {
            const interval = setInterval(fetchWorkflowRun, refreshInterval)

            // Set a 5-minute timeout to stop the interval
            const timeout = setTimeout(() => {
                clearInterval(interval)
            }, 5 * 60 * 1000) // 5 minutes

            return () => {
                clearInterval(interval)
                clearTimeout(timeout)
            }
        }
    }, [owner, repo, branch, autoRefresh, refreshInterval, workflowRun?.status, fetchWorkflowRun])

    return {
        workflowRun,
        loading,
        error,
        refresh,
        lastRefresh,
    }
}
