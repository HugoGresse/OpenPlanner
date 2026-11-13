// Browser mic capture for Gladia live v2. The SDK only handles the session/WebSocket; we still have to
// produce raw 16-bit PCM mono chunks at 16 kHz ourselves (the example does this with node-mic on the
// server; in the browser we use getUserMedia + an AudioWorklet to downsample and quantise).

// Worklet code runs in the AudioWorkletGlobalScope. `sampleRate` is a global there (the context rate,
// usually 44.1/48 kHz). We continuously decimate to the target rate and convert Float32 → Int16.
const WORKLET_CODE = `
class PcmDownsampler extends AudioWorkletProcessor {
    constructor(options) {
        super()
        this._ratio = sampleRate / options.processorOptions.targetSampleRate
        this._pos = 0
    }
    process(inputs) {
        const channel = inputs[0] && inputs[0][0]
        if (!channel) return true
        const out = []
        let pos = this._pos
        while (pos < channel.length) {
            const s = Math.max(-1, Math.min(1, channel[pos | 0]))
            out.push(s < 0 ? s * 0x8000 : s * 0x7fff)
            pos += this._ratio
        }
        // Carry the fractional read position into the next block so we don't drift.
        this._pos = pos - channel.length
        if (out.length) {
            const buffer = new Int16Array(out).buffer
            this.port.postMessage(buffer, [buffer])
        }
        return true
    }
}
registerProcessor('pcm-downsampler', PcmDownsampler)
`

export type PcmRecorder = { stop: () => void }

export const startPcmRecorder = async (
    onChunk: (chunk: ArrayBuffer) => void,
    targetSampleRate = 16_000
): Promise<PcmRecorder> => {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    })
    const context = new AudioContext()
    const moduleUrl = URL.createObjectURL(new Blob([WORKLET_CODE], { type: 'application/javascript' }))
    try {
        await context.audioWorklet.addModule(moduleUrl)
    } finally {
        URL.revokeObjectURL(moduleUrl)
    }

    const source = context.createMediaStreamSource(stream)
    const worklet = new AudioWorkletNode(context, 'pcm-downsampler', { processorOptions: { targetSampleRate } })
    worklet.port.onmessage = (event) => onChunk(event.data as ArrayBuffer)

    // Route through a silent gain to the destination so the graph stays pulled (a worklet with no path
    // to the output is not guaranteed to process), without echoing the mic to the speakers.
    const mute = context.createGain()
    mute.gain.value = 0
    source.connect(worklet)
    worklet.connect(mute)
    mute.connect(context.destination)

    return {
        stop: () => {
            worklet.port.onmessage = null
            source.disconnect()
            worklet.disconnect()
            mute.disconnect()
            stream.getTracks().forEach((track) => track.stop())
            void context.close()
        },
    }
}
