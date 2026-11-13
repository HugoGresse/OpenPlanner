import { useEffect, useState } from 'react'
import { getOpenPlannerAuth } from '../firebase'
import { API_URL } from '../../env'

export type AdminUsage = {
    totalStorageBytes: number
    totalFileCount: number
    networkAvailable: boolean
    totalNetworkBytes: number
    networkDays: { date: string; bytes: number; requests: number }[]
    events: {
        eventId: string
        storageBytes: number
        fileCount: number
        networkBytes: number
        networkRequests: number
    }[]
}

// Super-admin only: authenticated with the logged-in user's Firebase ID token,
// the API checks the admins/users/admins list server-side.
export const useAdminUsage = () => {
    const [data, setData] = useState<AdminUsage | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            try {
                const user = getOpenPlannerAuth().currentUser
                if (!user) {
                    throw new Error('Not logged in')
                }
                const token = await user.getIdToken()
                const url = new URL(API_URL as string)
                url.pathname += 'v1/admin/usage'
                const response = await fetch(url.href, { headers: { Authorization: `Bearer ${token}` } })
                if (!response.ok) {
                    throw new Error(`Failed to load usage (${response.status})`)
                }
                setData(await response.json())
            } catch (fetchError) {
                setError('' + fetchError)
            }
            setLoading(false)
        }
        load()
    }, [])

    return { data, error, isLoading }
}
