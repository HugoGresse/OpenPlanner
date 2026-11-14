import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material'
import { CAPABILITIES, Capability } from '../../../../../functions/src/api/routes/chat/capabilities'

// The inventory the API, the CLI skill and the assistant prompt are generated from: one row per capability.
const ROWS: readonly Capability[] = CAPABILITIES

const mono = { fontFamily: 'monospace', fontSize: '0.75rem' }

export const CAPABILITY_COUNT = ROWS.length

export const CapabilityTable = () => (
    <TableContainer sx={{ maxHeight: 480, mt: 1 }}>
        <Table size="small" stickyHeader>
            <TableHead>
                <TableRow>
                    <TableCell>Area</TableCell>
                    <TableCell>Capability</TableCell>
                    <TableCell>CLI</TableCell>
                    <TableCell>Assistant, Slack bot and MCP</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {ROWS.map((capability) => (
                    <TableRow key={capability.id} hover>
                        <TableCell>{capability.domain}</TableCell>
                        <TableCell>{capability.summary}</TableCell>
                        <TableCell sx={mono}>{capability.cli ? `openplanner ${capability.cli}` : '—'}</TableCell>
                        <TableCell>
                            {capability.assistantGap ? (
                                <Tooltip title={capability.assistantGap} placement="left">
                                    <Typography variant="body2" color="text.secondary" component="span">
                                        Not available
                                    </Typography>
                                </Tooltip>
                            ) : (
                                'Yes'
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
)
