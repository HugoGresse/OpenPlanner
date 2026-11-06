import { Command } from 'commander'
import { ApiClient, createClient, RequestOptions } from './client.js'
import { loadConfigFile, resolveSettings, Settings } from './config.js'
import { collect, DataOptions } from './input.js'
import { fail, OutputOptions, parseFieldList, printResult } from './output.js'

export type { DataOptions }

export type GlobalOptions = {
    event?: string
    apiKey?: string
    apiUrl?: string
    profile?: string
    compact?: boolean
    fields?: string
}

export type Context = {
    client: ApiClient
    settings: Settings
    output: OutputOptions
}

export const createContext = (command: Command): Context => {
    const globals = command.optsWithGlobals<GlobalOptions>()
    const settings = resolveSettings({
        flags: { eventId: globals.event, apiKey: globals.apiKey, apiUrl: globals.apiUrl, profile: globals.profile },
        env: process.env,
        file: loadConfigFile(),
    })
    return {
        client: createClient(settings),
        settings,
        output: { compact: globals.compact, fields: parseFieldList(globals.fields) },
    }
}

type Handler<Options> = (ctx: Context, options: Options, ...positionals: string[]) => Promise<unknown>

export const run =
    <Options = Record<string, never>>(handler: Handler<Options>) =>
    async (...args: unknown[]): Promise<void> => {
        const command = args[args.length - 1] as Command
        const options = args[args.length - 2] as Options
        const positionals = args.slice(0, -2).flat() as string[]
        try {
            const ctx = createContext(command)
            printResult(await handler(ctx, options, ...positionals), ctx.output)
        } catch (error) {
            fail(error)
        }
    }

export const call = (method: string, path: string, extra: Partial<RequestOptions> = {}) =>
    run((ctx) => ctx.client.request({ method, path, ...extra }))

export const DATA_HELP = 'JSON body: inline, @file.json, or - for stdin'

export const dataOptions = (command: Command, { required = false } = {}): Command =>
    (required
        ? command.requiredOption('-d, --data <json>', DATA_HELP)
        : command.option('-d, --data <json>', DATA_HELP)
    ).option(
        '-s, --set <key=value>',
        'Set one body field (repeatable; dotted keys; JSON values when parseable)',
        collect
    )
