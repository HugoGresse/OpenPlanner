import fs from 'fs/promises'
import PDFMergerBase, { PdfInput } from './PDFMergerBase'
import { PathLike } from 'fs'

type ExtendedPdfInput = PdfInput | Buffer | string | PathLike

class PDFMerger extends PDFMergerBase {
    async _getInputAsUint8Array(input: ExtendedPdfInput): Promise<Uint8Array> {
        if (input instanceof Buffer) {
            return input
        }

        if (typeof input === 'string') {
            try {
                await fs.access(input)
                return await fs.readFile(input)
            } catch (e) {
                try {
                    Boolean(new URL(input))
                    return await super._getInputAsUint8Array(new URL(input))
                } catch (e) {
                    throw new Error(`The provided string "${input}" is neither a valid file-path nor a valid URL!`)
                }
            }
        }

        return await super._getInputAsUint8Array(input as PdfInput)
    }

    async saveAsBuffer(): Promise<Buffer> {
        const uInt8Array = await this._saveAsUint8Array()
        return Buffer.from(uInt8Array)
    }

    async save(fileName: string | PathLike): Promise<void> {
        const pdfBytes = await this._saveAsUint8Array()
        await fs.writeFile(fileName, pdfBytes)
    }
}

export default PDFMerger
