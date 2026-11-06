import { Command } from 'commander'
import { configPath, loadConfigFile, maskSecret, resolveProfileName, saveConfigFile, upsertProfile } from '../config.js'
import { createContext } from '../context.js'
import { fail, printResult } from '../output.js'

type SetOptions = { event?: string; apiKey?: string; apiUrl?: string; profile?: string; use?: boolean }

export const registerConfig = (program: Command): void => {
    const config = program.command('config').description(`Stored credentials (${configPath()})`)

    config
        .command('set')
        .summary('Store -e/--event, -k/--api-key, --api-url into a profile (-p/--profile, default "default")')
        .description(
            'Store the global flags in a profile: openplanner config set -e <eventId> -k <apiKey> [--api-url <url>] [-p <profile>]'
        )
        .option('--no-use', 'Do not switch the current profile to this one')
        .action((_options: unknown, command: Command) => {
            const options = command.optsWithGlobals<SetOptions>()
            const patch = { eventId: options.event, apiKey: options.apiKey, apiUrl: options.apiUrl }
            if (Object.values(patch).every((value) => value === undefined)) {
                return fail(new Error('Nothing to store: pass -e <eventId>, -k <apiKey> and/or --api-url <url>'))
            }
            const file = loadConfigFile()
            const profile = resolveProfileName(options.profile, process.env, file)
            const next = upsertProfile(file, profile, patch, options.use !== false)
            saveConfigFile(next)
            printResult({ saved: true, profile, current: next.current, path: configPath() })
        })

    config
        .command('use <profile>')
        .description('Switch the current profile')
        .action((profile: string) => {
            const file = loadConfigFile()
            if (!file.profiles[profile]) return fail(new Error(`Unknown profile "${profile}"`))
            saveConfigFile({ ...file, current: profile })
            printResult({ current: profile })
        })

    config
        .command('show')
        .description('Effective settings after flags, env and config file (API key masked)')
        .action((_options: unknown, command: Command) => {
            const { settings } = createContext(command)
            printResult({ ...settings, apiKey: maskSecret(settings.apiKey), path: configPath() })
        })

    config
        .command('list')
        .description('Stored profiles')
        .action(() => {
            const file = loadConfigFile()
            const profiles = Object.fromEntries(
                Object.entries(file.profiles).map(([name, profile]) => [
                    name,
                    { ...profile, apiKey: maskSecret(profile.apiKey) },
                ])
            )
            printResult({ current: file.current, profiles })
        })
}
