export const API_KEY_ENV = 'OPENPLANNER_API_KEY'
export const CLI_REPOSITORY = 'https://github.com/HugoGresse/OpenPlanner'

export type SnippetContext = { apiUrl: string; eventId: string }

const trimSlash = (url: string) => url.replace(/\/+$/, '')

export const mcpUrl = ({ apiUrl, eventId }: SnippetContext, readOnly = false): string =>
    `${trimSlash(apiUrl)}/v1/${encodeURIComponent(eventId)}/mcp${readOnly ? '?readOnly=true' : ''}`

// Snippets never contain the key itself: it is read from the environment, so nothing secret is on screen.
export const exportKeySnippet = (): string => `export ${API_KEY_ENV}="<API key shown above>"`

export const claudeCodeSnippet = (ctx: SnippetContext, readOnly = false): string =>
    `claude mcp add --transport http openplanner "${mcpUrl(ctx, readOnly)}" \\
  --header "Authorization: Bearer $${API_KEY_ENV}"`

export const mcpJsonSnippet = (ctx: SnippetContext, readOnly = false): string =>
    JSON.stringify(
        {
            mcpServers: {
                openplanner: {
                    type: 'http',
                    url: mcpUrl(ctx, readOnly),
                    headers: { Authorization: `Bearer \${${API_KEY_ENV}}` },
                },
            },
        },
        null,
        2
    )

export const codexSnippet = (ctx: SnippetContext, readOnly = false): string =>
    `# ~/.codex/config.toml
[mcp_servers.openplanner]
url = "${mcpUrl(ctx, readOnly)}"
bearer_token_env_var = "${API_KEY_ENV}"`

export const cliInstallSnippet = (): string =>
    `git clone ${CLI_REPOSITORY}.git
cd OpenPlanner/cli && npm install && npm run build && npm link`

export const cliSetupSnippet = ({ apiUrl, eventId }: SnippetContext): string => {
    const custom = trimSlash(apiUrl) === 'https://api.openplanner.fr' ? '' : ` --api-url ${trimSlash(apiUrl)}`
    return `openplanner config set -e ${eventId} -k "$${API_KEY_ENV}"${custom}
openplanner skill install          # teaches Claude Code and Codex the commands
openplanner sessions list -f id,title`
}
