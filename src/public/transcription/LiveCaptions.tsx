import { createRef, forwardRef, useRef } from 'react'
import { Box } from '@mui/material'
import { TransitionGroup, CSSTransition } from 'react-transition-group'
import { TranscriptionSettings, toCssColor } from './transcriptionSettings'
import { TranscriptLine } from './useLiveTranscription'

export type LiveCaptionsProps = {
    lines: TranscriptLine[]
    partial: string
    settings: TranscriptionSettings
}

const EXIT_MS = 450

const CaptionRow = forwardRef<HTMLDivElement, { text: string; dim?: boolean }>(({ text, dim }, ref) => (
    <div ref={ref} className="caption-row">
        <div className="caption-inner">
            <p style={{ margin: 0, padding: 0, opacity: dim ? 0.75 : 1 }}>{text}</p>
        </div>
    </div>
))
CaptionRow.displayName = 'CaptionRow'

// Top-anchored subtitles. Final lines live in a TransitionGroup so the oldest collapses + slides up as
// it scrolls out. The live partial is rendered OUTSIDE the group (plain) — otherwise promoting it to a
// final would make the partial node exit while the new final enters, i.e. the line "moves up and
// reappears". Enter animation is disabled because every final is a promoted partial (already on screen),
// so animating it in would flicker.
export const LiveCaptions = ({ lines, partial, settings }: LiveCaptionsProps) => {
    const { fontSize, lineHeight, fontName, backgroundColor, textColor, maxLines, alignment } = settings
    const lineHeightPx = fontSize * lineHeight
    // Reserve a row for the live partial so finals + partial never exceed maxLines.
    const finals = lines.slice(-Math.max(0, maxLines - (partial ? 1 : 0)))

    // One stable nodeRef per line id (lets CSSTransition avoid the deprecated findDOMNode).
    const refs = useRef(new Map<string, React.RefObject<HTMLDivElement>>())
    const refFor = (id: string) => {
        const existing = refs.current.get(id)
        if (existing) return existing
        const created = createRef<HTMLDivElement>()
        refs.current.set(id, created)
        return created
    }

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
                backgroundColor: toCssColor(backgroundColor),
                color: toCssColor(textColor),
                textAlign: alignment,
                wordBreak: 'break-word',
            }}>
            <TransitionGroup component={null}>
                {finals.map((line) => {
                    const nodeRef = refFor(line.id)
                    return (
                        <CSSTransition
                            key={line.id}
                            nodeRef={nodeRef}
                            timeout={EXIT_MS}
                            classNames="caption"
                            enter={false}>
                            <CaptionRow ref={nodeRef} text={line.text} />
                        </CSSTransition>
                    )
                })}
            </TransitionGroup>

            {partial && <CaptionRow text={partial} dim />}

            <style>{`
                .caption-row { display: grid; grid-template-rows: 1fr; }
                .caption-inner { overflow: hidden; }
                .caption-exit { grid-template-rows: 1fr; opacity: 1; }
                .caption-exit-active {
                    grid-template-rows: 0fr;
                    opacity: 0;
                    transition: grid-template-rows ${EXIT_MS}ms ease, opacity ${EXIT_MS}ms ease;
                }
                .caption-exit-active .caption-inner { transform: translateY(-12px); transition: transform ${EXIT_MS}ms ease; }
            `}</style>
        </Box>
    )
}
