import { DateTime } from 'luxon'
import { useEffect, useRef, useState } from 'react'
import { useLocalStorage } from '@uidotdev/usehooks'
import { PublicJSON } from '../publicTypes'
import { formatRelativeStart, intermissionStrings } from './intermissionI18n'

const IDLE_MS = 5000

// Animated "shine" that travels around the card border (conic gradient clipped to a 2px ring)
const shineCss = `
@property --op-shine-ang { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.op-shine::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: conic-gradient(from var(--op-shine-ang),
        rgba(255,255,255,0.05) 0deg,
        rgba(255,255,255,0.05) 60deg,
        rgba(255,255,255,0.95) 90deg,
        #ff4d6d 110deg,
        rgba(255,255,255,0.05) 150deg,
        rgba(255,255,255,0.05) 360deg);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    animation: op-shine-spin 5s linear infinite;
    pointer-events: none;
}
@keyframes op-shine-spin { to { --op-shine-ang: 360deg; } }
.op-content-inner { animation: op-inner-up 0.45s ease both; }
@keyframes op-inner-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
    .op-shine::before, .op-content-inner { animation: none; }
}
`

export type IntermissionScreenProps = {
    mediaUrl: string | null
    nextTalk: PublicJSON['sessions'][0] | undefined
    trackName: string
    categoryName?: string
    categoryColor?: string | null
    language?: string | null
    eventName?: string
    speakers: { id: string; name: string }[]
    onChangeTrack: () => void
}

const isVideo = (url: string) => /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i.test(url)

export const IntermissionScreen = ({
    mediaUrl,
    nextTalk,
    trackName,
    categoryName,
    categoryColor,
    language,
    eventName,
    speakers,
    onChangeTrack,
}: IntermissionScreenProps) => {
    const t = intermissionStrings(language)
    const speakerNames = nextTalk
        ? (nextTalk.speakerIds || nextTalk.speakersIds || [])
              .map((id) => speakers.find((s) => s.id === id)?.name)
              .filter(Boolean)
              .join(', ')
        : ''
    const startTime = nextTalk ? DateTime.fromISO(nextTalk.dateStart).toFormat('HH:mm') : ''

    // Persisted display options (cog menu, top-right)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [layoutScale, setLayoutScale] = useLocalStorage<number>('intermissionLayoutScale', 100)
    const [intermittent, setIntermittent] = useLocalStorage<boolean>('intermissionIntermittent', false)
    const [intervalSec, setIntervalSec] = useLocalStorage<number>('intermissionIntervalSec', 5)

    // Intermittent display: cycle the card on for `intervalSec`, then off for the same duration
    const [cardShown, setCardShown] = useState(true)
    useEffect(() => {
        if (!intermittent) {
            setCardShown(true)
            return
        }
        setCardShown(true)
        const id = setInterval(() => setCardShown((v) => !v), Math.max(4, intervalSec) * 1000)
        return () => clearInterval(id)
    }, [intermittent, intervalSec])

    // Fullscreen toggle — the intermission runs on a room screen, so let the operator go edge-to-edge
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])
    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen?.()
        } else {
            document.documentElement.requestFullscreen?.()
        }
    }

    // Hide the controls (and cursor) after a period of pointer inactivity; reveal on any movement
    const [idle, setIdle] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Tick so the relative "in X min" stays accurate without a reload
    const [now, setNow] = useState(() => DateTime.now())
    useEffect(() => {
        const id = setInterval(() => setNow(DateTime.now()), 30000)
        return () => clearInterval(id)
    }, [])

    const isOngoing = nextTalk
        ? DateTime.fromISO(nextTalk.dateStart) <= now && DateTime.fromISO(nextTalk.dateEnd) > now
        : false
    // When the talk is already running, the relative phrase is redundant with the "Now" eyebrow
    const relativeStart =
        nextTalk && !isOngoing ? formatRelativeStart(nextTalk.dateStart, nextTalk.dateEnd, now, language) : ''

    useEffect(() => {
        const onMove = () => {
            setIdle(false)
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => setIdle(true), IDLE_MS)
        }
        onMove()
        window.addEventListener('mousemove', onMove)
        window.addEventListener('pointermove', onMove)
        window.addEventListener('touchstart', onMove)
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('touchstart', onMove)
        }
    }, [])

    return (
        <div style={{ ...styles.root, cursor: idle ? 'none' : 'auto' }}>
            {mediaUrl ? (
                isVideo(mediaUrl) ? (
                    <video style={styles.media} src={mediaUrl} autoPlay muted loop playsInline />
                ) : (
                    <img style={styles.media} src={mediaUrl} alt="" />
                )
            ) : (
                <div style={{ ...styles.media, ...styles.fallbackBg }} />
            )}

            {/* Controls — cog + settings panel, top-right; fade out when idle */}
            <div
                style={{
                    ...styles.controls,
                    opacity: idle && !settingsOpen ? 0 : 1,
                    pointerEvents: idle && !settingsOpen ? 'none' : 'auto',
                    transition: 'opacity 0.4s ease',
                }}>
                <button
                    style={styles.cog}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    onClick={toggleFullscreen}>
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        {isFullscreen ? (
                            <>
                                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                            </>
                        ) : (
                            <>
                                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                            </>
                        )}
                    </svg>
                </button>

                <button style={styles.cog} aria-label="Settings" onClick={() => setSettingsOpen((v) => !v)}>
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </button>

                {settingsOpen && (
                    <div style={styles.panel}>
                        <div style={styles.panelLabel}>Layout size</div>
                        <div style={styles.sliderRow}>
                            <input
                                type="range"
                                min={25}
                                max={100}
                                step={5}
                                value={layoutScale}
                                onChange={(e) => setLayoutScale(Number(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <span style={styles.sliderValue}>{layoutScale}%</span>
                        </div>

                        <div style={{ ...styles.panelLabel, marginTop: 16 }}>
                            <label style={styles.switchRow}>
                                <input
                                    type="checkbox"
                                    checked={intermittent}
                                    onChange={(e) => setIntermittent(e.target.checked)}
                                />
                                Intermittent display
                            </label>
                        </div>
                        {intermittent && (
                            <div style={styles.sliderRow}>
                                <input
                                    type="range"
                                    min={4}
                                    max={20}
                                    step={1}
                                    value={intervalSec}
                                    onChange={(e) => setIntervalSec(Number(e.target.value))}
                                    style={{ flex: 1 }}
                                />
                                <span style={styles.sliderValue}>{intervalSec}s</span>
                            </div>
                        )}

                        <button style={styles.panelAction} onClick={onChangeTrack}>
                            Change track
                        </button>
                    </div>
                )}
            </div>

            <style>{shineCss}</style>
            <div style={styles.contentWrap}>
                <div
                    className="op-shine"
                    style={{
                        ...styles.content,
                        transform: `scale(${layoutScale / 100})`,
                        transformOrigin: 'bottom center',
                        opacity: cardShown ? 1 : 0,
                        transition: 'opacity 0.6s ease',
                    }}>
                    <div className={cardShown ? 'op-content-inner' : undefined} key={cardShown ? 'shown' : 'hidden'}>
                        {nextTalk ? (
                            <>
                                <div style={styles.eyebrow}>
                                    <span style={styles.dot} />
                                    {isOngoing ? t.now : t.upNext}
                                    {trackName ? ` · ${trackName}` : ''}
                                    {categoryName && (
                                        <span
                                            style={{
                                                ...styles.categoryPill,
                                                background: categoryColor || 'rgba(255,255,255,0.18)',
                                            }}>
                                            {categoryName}
                                        </span>
                                    )}
                                </div>
                                <div style={styles.title}>{nextTalk.title}</div>
                                <div style={styles.meta}>
                                    {startTime && <span style={styles.time}>{startTime}</span>}
                                    {relativeStart && <span style={styles.relative}>{relativeStart}</span>}
                                    {speakerNames && <span style={styles.speakers}>{speakerNames}</span>}
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={styles.eyebrow}>
                                    <span style={styles.dot} />
                                    {trackName || eventName || ''}
                                </div>
                                <div style={styles.title}>{t.wrapTitle}</div>
                                <div style={styles.meta}>
                                    <span style={styles.speakers}>{t.wrapSubtitle}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

const styles: { [key: string]: React.CSSProperties } = {
    root: {
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
        fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
    },
    media: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    fallbackBg: {
        background: 'radial-gradient(circle at 30% 20%, #2a2a72, #000 70%)',
    },
    controls: {
        position: 'absolute',
        top: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        zIndex: 10,
    },
    cog: {
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.25)',
        background: 'rgba(0,0,0,0.4)',
        color: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        fontSize: 20,
        cursor: 'pointer',
        lineHeight: 1,
    },
    panel: {
        width: 240,
        padding: '16px 18px',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(12,12,16,0.85)',
        backdropFilter: 'blur(14px)',
        color: '#fff',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    },
    panelLabel: {
        fontSize: 13,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    switchRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.8)',
        cursor: 'pointer',
    },
    sliderRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
    },
    sliderValue: {
        fontSize: 13,
        fontWeight: 600,
        minWidth: 32,
        textAlign: 'right',
    },
    panelAction: {
        width: '100%',
        marginTop: 16,
        padding: '8px 0',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.25)',
        background: 'rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        cursor: 'pointer',
    },
    contentWrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '5vh',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
    },
    content: {
        maxWidth: '90vw',
        minWidth: 'min(620px, 86vw)',
        color: '#fff',
        background: 'rgba(10,10,14,0.55)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 18,
        padding: 'clamp(16px, 2.2vh, 28px) clamp(20px, 2.6vw, 36px)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
    },
    eyebrow: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 'clamp(13px, 1.1vw, 18px)',
        fontWeight: 600,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 'clamp(6px, 1vh, 12px)',
    },
    dot: {
        width: 9,
        height: 9,
        borderRadius: '50%',
        background: '#ff4d6d',
        boxShadow: '0 0 12px 3px rgba(255,77,109,0.8)',
    },
    title: {
        fontSize: 'clamp(26px, 3.2vw, 52px)',
        fontWeight: 700,
        lineHeight: 1.08,
        letterSpacing: -0.5,
    },
    meta: {
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(12px, 1.4vw, 22px)',
        marginTop: 'clamp(10px, 1.4vh, 18px)',
        flexWrap: 'wrap',
    },
    time: {
        fontSize: 'clamp(16px, 1.6vw, 26px)',
        fontWeight: 700,
        padding: '4px 14px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.14)',
        border: '1px solid rgba(255,255,255,0.2)',
    },
    relative: {
        fontSize: 'clamp(15px, 1.4vw, 23px)',
        fontWeight: 600,
        color: '#ff7591',
    },
    speakers: {
        fontSize: 'clamp(15px, 1.5vw, 24px)',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.92)',
    },
    categoryPill: {
        marginLeft: 6,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 'clamp(11px, 0.9vw, 15px)',
        fontWeight: 600,
        letterSpacing: 1,
        color: '#fff',
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
    },
}
