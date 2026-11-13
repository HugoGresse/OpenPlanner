import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const DEFAULT_API_URL = 'https://api.openplanner.fr'
export const DEFAULT_PROFILE = 'default'

export type Profile = {
    apiUrl?: string
    eventId?: string
    apiKey?: string
}

export type ConfigFile = {
    current?: string
    profiles: Record<string, Profile>
}

export type Settings = {
    apiUrl: string
    eventId?: string
    apiKey?: string
    profile: string
}

export type SettingsInput = {
    flags: Profile & { profile?: string }
    env: Record<string, string | undefined>
    file: ConfigFile
}

export const configPath = (env: Record<string, string | undefined> = process.env): string =>
    env.OPENPLANNER_CONFIG || join(homedir(), '.config', 'openplanner', 'config.json')

export const emptyConfig = (): ConfigFile => ({ profiles: {} })

export const loadConfigFile = (path: string = configPath()): ConfigFile => {
    if (!existsSync(path)) return emptyConfig()
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<ConfigFile>
    return { current: parsed.current, profiles: parsed.profiles ?? {} }
}

export const saveConfigFile = (config: ConfigFile, path: string = configPath()): void => {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 })
    chmodSync(path, 0o600)
}

const firstDefined = (...values: Array<string | undefined>): string | undefined =>
    values.find((value) => value !== undefined && value !== '')

export const resolveProfileName = (
    flag: string | undefined,
    env: Record<string, string | undefined>,
    file: ConfigFile
) => firstDefined(flag, env.OPENPLANNER_PROFILE, file.current) ?? DEFAULT_PROFILE

export const resolveSettings = ({ flags, env, file }: SettingsInput): Settings => {
    const profile = resolveProfileName(flags.profile, env, file)
    const stored = file.profiles[profile] ?? {}
    return {
        profile,
        apiUrl: stripTrailingSlash(
            firstDefined(flags.apiUrl, env.OPENPLANNER_API_URL, stored.apiUrl) ?? DEFAULT_API_URL
        ),
        eventId: firstDefined(flags.eventId, env.OPENPLANNER_EVENT_ID, stored.eventId),
        apiKey: firstDefined(flags.apiKey, env.OPENPLANNER_API_KEY, stored.apiKey),
    }
}

export const upsertProfile = (file: ConfigFile, name: string, patch: Profile, makeCurrent: boolean): ConfigFile => {
    const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Profile
    const merged = { ...(file.profiles[name] ?? {}), ...defined }
    return {
        current: makeCurrent || !file.current ? name : file.current,
        profiles: { ...file.profiles, [name]: merged },
    }
}

export const maskSecret = (value?: string): string | undefined =>
    value === undefined ? undefined : value.length <= 8 ? '****' : `${value.slice(0, 4)}…${value.slice(-4)}`

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '')
