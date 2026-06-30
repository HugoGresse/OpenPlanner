import { Box } from '@mui/material'
import { TranscriptionSettings, toCssColor } from './transcriptionSettings'
import { TranscriptLine } from './useLiveTranscription'

export type LiveCaptionsProps = {
    lines: TranscriptLine[]
    partial: string
    settings: TranscriptionSettings
}

// Renders the most recent `maxLines` final transcript lines (plus the live partial) as bottom-anchored
// subtitles, styled from the operator settings. Mirrors the look of the old gladia.html #result box.
export const LiveCaptions = ({ lines, partial, settings }: LiveCaptionsProps) => {
    const { fontSize, lineHeight, fontName, backgroundColor, textColor, maxLines, alignment } = settings
    const lineHeightPx = fontSize * lineHeight
    const visible = [...lines.map((l) => l.text), ...(partial ? [partial] : [])].slice(-maxLines)

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                boxSizing: 'border-box',
                padding: '20px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                fontWeight: 600,
                fontFamily: fontName,
                fontSize: `${fontSize}px`,
                lineHeight: `${lineHeightPx}px`,
                height: `${lineHeightPx * maxLines + 20}px`,
                backgroundColor: toCssColor(backgroundColor),
                color: toCssColor(textColor),
                textAlign: alignment,
                wordBreak: 'break-word',
            }}>
            {visible.map((text, index) => (
                <p key={index} style={{ margin: 0, padding: 0, animation: 'captionFadeIn 0.2s' }}>
                    {text}
                </p>
            ))}
            <style>{`@keyframes captionFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
        </Box>
    )
}
