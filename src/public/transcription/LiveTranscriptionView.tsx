import { useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { LiveCaptions } from './LiveCaptions'
import { TalkInfo } from './TalkInfoBar'
import { TranscriptionSettingsPanel } from './TranscriptionSettingsPanel'
import { useLiveTranscription } from './useLiveTranscription'
import { settingsFromQuery, TranscriptionSettings } from './transcriptionSettings'

export type LiveTranscriptionViewProps = {
    apiKey: string | undefined
    // Changes (e.g. selecting another talk) restart the Gladia session.
    sessionKey: string
    trackName: string
    talkTitle: string
    dateStart: string
    dateEnd: string
    nextTalkTitle?: string
    onNext: () => void
    onClear: () => void
}

// Self-contained live caption screen: replaces the old /gladia.html iframe. Captures the mic, runs the
// Gladia live v2 session via @gladiaio/sdk, renders subtitles, and owns the single bottom bar holding
// the talk info and every control (so nothing overlaps).
export const LiveTranscriptionView = ({
    apiKey,
    sessionKey,
    trackName,
    talkTitle,
    dateStart,
    dateEnd,
    nextTalkTitle,
    onNext,
    onClear,
}: LiveTranscriptionViewProps) => {
    const [settings, setSettings] = useState<TranscriptionSettings>(() => settingsFromQuery(window.location.search))
    // Bumped by the Restart button to force a fresh Gladia session + mic capture.
    const [restartNonce, setRestartNonce] = useState(0)
    const { lines, partial, status, error } = useLiveTranscription(apiKey, settings, `${sessionKey}-${restartNonce}`)

    const updateSettings = (next: TranscriptionSettings) => setSettings(next)

    return (
        <Box sx={{ position: 'absolute', inset: 0, backgroundColor: '#000' }}>
            {!apiKey && <Typography sx={{ color: 'red', p: 2 }}>Missing Gladia API key.</Typography>}
            {status === 'connecting' && <Typography sx={{ color: 'white', p: 2 }}>Connecting to Gladia…</Typography>}
            {status === 'error' && <Typography sx={{ color: 'red', p: 2 }}>Error: {error}</Typography>}

            {!settings.hideSettings && <TranscriptionSettingsPanel settings={settings} onChange={updateSettings} />}

            <LiveCaptions lines={lines} partial={partial} settings={settings} />

            {/* Single bottom bar: talk info + all controls. Wraps to multiple lines on narrow screens. */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 999,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1,
                    bgcolor: 'rgba(0,0,0,0.82)',
                    color: '#fff',
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(4px)',
                }}>
                <TalkInfo
                    trackName={trackName}
                    talkTitle={talkTitle}
                    dateStart={dateStart}
                    dateEnd={dateEnd}
                    nextTalkTitle={nextTalkTitle}
                />

                <Stack direction="row" spacing={1} sx={{ ml: 'auto', flexShrink: 0 }}>
                    <Button variant="contained" size="small" onClick={onNext} disabled={!nextTalkTitle}>
                        Next talk ▸
                    </Button>
                    <Button variant="outlined" size="small" color="inherit" onClick={onClear}>
                        Clear
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        color="warning"
                        onClick={() => setRestartNonce((n) => n + 1)}>
                        Restart
                    </Button>
                    {settings.hideSettings && (
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => updateSettings({ ...settings, hideSettings: false })}>
                            Show settings
                        </Button>
                    )}
                </Stack>
            </Box>
        </Box>
    )
}
