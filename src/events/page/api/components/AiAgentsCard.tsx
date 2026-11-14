import { useState } from 'react'
import { Alert, Box, Button, Card, Collapse, IconButton, Link as MuiLink, Typography } from '@mui/material'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { Link } from 'wouter'
import { Event } from '../../../../types'
import { API_URL } from '../../../../env'
import { CodeSnippet } from '../../../../components/CodeSnippet'
import { TypographyCopyable } from '../../../../components/TypographyCopyable'
import { CAPABILITY_COUNT, CapabilityTable } from './CapabilityTable'
import {
    claudeCodeSnippet,
    cliInstallSnippet,
    cliSetupSnippet,
    CLI_REPOSITORY,
    codexSnippet,
    exportKeySnippet,
    mcpJsonSnippet,
    mcpUrl,
} from './aiSnippets'

export type AiAgentsCardProps = {
    event: Event
}

const SectionTitle = ({ children }: { children: string }) => (
    <Typography fontWeight="600" mt={4}>
        {children}
    </Typography>
)

export const AiAgentsCard = ({ event }: AiAgentsCardProps) => {
    const [expanded, setExpanded] = useState(true)
    const [showCapabilities, setShowCapabilities] = useState(false)
    const ctx = { apiUrl: API_URL as string, eventId: event.id }

    return (
        <Card sx={{ paddingX: 2, mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
                <Box sx={{ mt: 2 }}>
                    <Typography fontSize="large">AI & agents</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Let Claude, Codex or any AI client read and edit this event: MCP server, command line, built-in
                        assistant.
                    </Typography>
                </Box>
                <IconButton
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                    sx={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '0.3s' }}>
                    <ExpandMoreIcon />
                </IconButton>
            </Box>
            <Collapse in={expanded}>
                <Typography variant="body2">
                    All three use the event API key above. Keep it in an environment variable, the snippets below read
                    it from there:
                </Typography>
                <CodeSnippet code={exportKeySnippet()} />

                <SectionTitle>MCP server (Claude, Codex, ChatGPT and other AI apps)</SectionTitle>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    A remote MCP server with the same tools as the built-in assistant. Reads return data. Writes are two
                    steps: a <code>propose…</code> tool returns the change and its diff, and <code>applyProposal</code>{' '}
                    applies it once you agree, so your AI client asks you before anything changes.
                </Typography>
                <TypographyCopyable>{mcpUrl(ctx)}</TypographyCopyable>
                <CodeSnippet label="Claude Code" code={claudeCodeSnippet(ctx)} />
                <CodeSnippet label="Claude Code, shared with a repository (.mcp.json)" code={mcpJsonSnippet(ctx)} />
                <CodeSnippet label="Codex" code={codexSnippet(ctx)} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    Other clients (Claude desktop or web custom connector, ChatGPT…): add the URL above as a remote MCP
                    server and send the header <code>Authorization: Bearer &lt;API key&gt;</code>. Add{' '}
                    <code>?readOnly=true</code> to the URL for a connector that can only read:
                </Typography>
                <Box sx={{ mt: 1 }}>
                    <TypographyCopyable>{mcpUrl(ctx, true)}</TypographyCopyable>
                </Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                    A client that cannot send a header can use <code>?apiKey=&lt;API key&gt;</code> in the URL instead.
                    The key then appears in that client's settings and logs: generate a new one if it leaks.
                </Alert>

                <SectionTitle>Command line and agent skill (Claude Code, Codex, scripts, CI)</SectionTitle>
                <Typography variant="body2">
                    The <code>openplanner</code> CLI covers more than the MCP server (file uploads, bulk import,
                    exports, WhatsApp, any API route) and prints JSON. Its skill teaches a coding agent the commands and
                    the safety rules. Source and documentation:{' '}
                    <MuiLink href={`${CLI_REPOSITORY}/tree/main/cli`} target="_blank" rel="noreferrer">
                        cli/README.md
                    </MuiLink>
                    .
                </Typography>
                <CodeSnippet label="Install" code={cliInstallSnippet()} />
                <CodeSnippet label="Connect this event" code={cliSetupSnippet(ctx)} />

                <SectionTitle>Built-in assistant</SectionTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2">
                        The chat in this app and the Slack bot run the same tools on the event's own OpenRouter key
                        (Event settings). Every change is a proposal you approve.
                    </Typography>
                    <Button component={Link} to="/slack" variant="outlined" sx={{ flexShrink: 0 }}>
                        Slack bot
                    </Button>
                </Box>

                <Box sx={{ mt: 3, mb: 2 }}>
                    <Button size="small" onClick={() => setShowCapabilities(!showCapabilities)}>
                        {showCapabilities ? 'Hide' : 'Show'} what each one can do ({CAPABILITY_COUNT} capabilities)
                    </Button>
                    <Collapse in={showCapabilities} unmountOnExit>
                        <CapabilityTable />
                    </Collapse>
                </Box>
            </Collapse>
        </Card>
    )
}
