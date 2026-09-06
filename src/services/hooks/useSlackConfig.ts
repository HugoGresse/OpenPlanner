import { useEffect, useState } from 'react'
import { API_URL } from '../../env'

export type SlackConfig = { officialApp: boolean }

const configUrl = () => {
    const url = new URL(API_URL as string)
    url.pathname += 'v1/slack/config'
    return url.href
}

export const useSlackConfig = (): { config: SlackConfig | null; isLoading: boolean } => {
    const [config, setConfig] = useState<SlackConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        fetch(configUrl())
            .then((response) => (response.ok ? response.json() : { officialApp: false }))
            .catch(() => ({ officialApp: false }))
            .then((json: SlackConfig) => {
                if (!cancelled) {
                    setConfig({ officialApp: json.officialApp === true })
                    setIsLoading(false)
                }
            })
        return () => {
            cancelled = true
        }
    }, [])

    return { config, isLoading }
}
