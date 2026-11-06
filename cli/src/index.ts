import { createRequire } from 'node:module'
import { Command } from 'commander'
import { registerApi } from './commands/api.js'
import { registerChat } from './commands/chat.js'
import { registerConfig } from './commands/config.js'
import { registerFaq, registerFiles, registerImport, registerLive } from './commands/content.js'
import { registerEvent } from './commands/event.js'
import { registerBupher, registerSlack, registerWhatsapp } from './commands/integrations.js'
import { registerSessions } from './commands/sessions.js'
import { registerSkill } from './commands/skill.js'
import { registerSpeakers } from './commands/speakers.js'
import { registerSponsors } from './commands/sponsors.js'
import { exitQuietlyOnClosedStdout, fail } from './output.js'

const { version } = createRequire(import.meta.url)('../package.json') as { version: string }

exitQuietlyOnClosedStdout()

const program = new Command()
    .name('openplanner')
    .description('OpenPlanner API client. Output is JSON on stdout; errors are JSON on stderr with exit code 1.')
    .version(version)
    .option('-e, --event <eventId>', 'Event id (or OPENPLANNER_EVENT_ID)')
    .option('-k, --api-key <key>', 'Event API key (or OPENPLANNER_API_KEY)')
    .option('--api-url <url>', 'API base URL (or OPENPLANNER_API_URL, default https://api.openplanner.fr)')
    .option('-p, --profile <name>', 'Config profile (or OPENPLANNER_PROFILE)')
    .option('-c, --compact', 'Single-line JSON output')
    .option('-f, --fields <list>', 'Only keep these fields (comma separated, dotted paths, `list.length`, `list.0`)')
    .showHelpAfterError('(run with --help for usage)')
    .configureHelp({ sortSubcommands: true })

registerConfig(program)
registerEvent(program)
registerSessions(program)
registerSpeakers(program)
registerSponsors(program)
registerFaq(program)
registerFiles(program)
registerImport(program)
registerLive(program)
registerWhatsapp(program)
registerBupher(program)
registerSlack(program)
registerChat(program)
registerApi(program)
registerSkill(program)

program.parseAsync(process.argv).catch(fail)
