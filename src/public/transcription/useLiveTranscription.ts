import { useEffect, useRef, useState } from 'react'
import { GladiaClient } from '@gladiaio/sdk'
import type { LiveV2Session } from '@gladiaio/sdk'
import { startPcmRecorder, PcmRecorder } from './pcmRecorder'
import { TranscriptionSettings } from './transcriptionSettings'

export type TranscriptionStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'error'

export type TranscriptLine = { id: string; text: string }

const SAMPLE_RATE = 16_000

// Drives one Gladia live v2 session: opens it, streams mic PCM into it, and surfaces final lines plus
// the in-progress partial. Only the session-shaping settings (languages, vocabulary, endpointing) are
// in the dependency list — restyling (font/colors) must not tear the session down.
export const useLiveTranscription = (
    apiKey: string | undefined,
    settings: TranscriptionSettings,
    // Bumped by the caller (e.g. on talk change) to force a fresh session.
    sessionKey: string
) => {
    const [lines, setLines] = useState<TranscriptLine[]>([])
    const [partial, setPartial] = useState('')
    const [status, setStatus] = useState<TranscriptionStatus>('idle')
    const [error, setError] = useState<string | null>(null)

    const languagesKey = settings.languages.join(',')
    const vocabularyKey = settings.customVocabulary.join(',')

    // Latest settings for use inside the long-lived effect without re-subscribing on every restyle.
    const settingsRef = useRef(settings)
    settingsRef.current = settings

    useEffect(() => {
        if (!apiKey) {
            setStatus('idle')
            return
        }

        const current = settingsRef.current
        let cancelled = false
        let started = false
        let session: LiveV2Session | null = null
        let recorder: PcmRecorder | null = null

        setLines([])
        setPartial('')
        setError(null)
        setStatus('connecting')

        const run = async () => {
            const client = new GladiaClient({ apiKey })
            session = client.liveV2().startSession({
                encoding: 'wav/pcm',
                bit_depth: 16,
                sample_rate: SAMPLE_RATE,
                channels: 1,
                endpointing: current.endpointing,
                maximum_duration_without_endpointing: 5,
                language_config: { languages: current.languages, code_switching: true },
                realtime_processing: current.customVocabulary.length
                    ? {
                          custom_vocabulary: true,
                          custom_vocabulary_config: { vocabulary: current.customVocabulary },
                      }
                    : undefined,
                messages_config: { receive_partial_transcripts: true, receive_final_transcripts: true },
            })

            session.once('started', () => {
                started = true
                if (!cancelled) setStatus('live')
            })
            session.on('message', (message) => {
                if (cancelled || message.type !== 'transcript') return
                const { is_final, utterance } = message.data
                const text = utterance.text.trim()
                if (!text) return
                if (is_final) {
                    setLines((prev) => [...prev, { id: `${utterance.start}-${utterance.end}-${prev.length}`, text }])
                    setPartial('')
                } else {
                    setPartial(text)
                }
            })
            session.on('error', (err) => {
                if (!cancelled) {
                    setError(err?.message || String(err))
                    setStatus('error')
                }
            })
            session.once('ended', () => {
                if (!cancelled) setStatus('ended')
            })

            try {
                recorder = await startPcmRecorder((chunk) => {
                    // Drop audio captured before the socket is up (the SDK no-ops it anyway).
                    if (!cancelled && started) session?.sendAudio(chunk)
                }, SAMPLE_RATE)
            } catch (err) {
                if (!cancelled) {
                    setError('Microphone access failed: ' + (err instanceof Error ? err.message : String(err)))
                    setStatus('error')
                }
            }
        }

        run()

        return () => {
            cancelled = true
            recorder?.stop()
            // endSession (not stopRecording) so a torn-down session — e.g. StrictMode's dev remount or a
            // manual restart — aborts immediately instead of flushing remaining audio.
            session?.endSession()
        }
    }, [apiKey, sessionKey, languagesKey, vocabularyKey, settings.endpointing])

    return { lines, partial, status, error }
}
