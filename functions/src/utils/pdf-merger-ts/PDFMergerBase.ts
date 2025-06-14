import { PDFDocument, LoadOptions } from 'pdf-lib'
import { parsePagesString } from './parsePagesString'

export interface Metadata {
    producer?: string
    author?: string
    title?: string
    creator?: string
}

export type PdfInput = Uint8Array | ArrayBuffer | Blob | URL

export default class PDFMergerBase {
    protected _doc?: PDFDocument
    protected _loadOptions: LoadOptions = {
        ignoreEncryption: true,
    }

    constructor() {
        this.reset()
    }

    reset(): void {
        this._doc = undefined
    }

    async setMetadata(metadata: Metadata): Promise<void> {
        await this._ensureDoc()
        if (metadata.producer) this._doc!.setProducer(metadata.producer)
        if (metadata.author) this._doc!.setAuthor(metadata.author)
        if (metadata.title) this._doc!.setTitle(metadata.title)
        if (metadata.creator) this._doc!.setCreator(metadata.creator)
    }

    async add(input: PdfInput, pages?: string | string[] | number | number[] | undefined | null): Promise<void> {
        await this._ensureDoc()
        if (typeof pages === 'undefined' || pages === null || pages === 'all') {
            await this._addPagesFromDocument(input)
        } else if (typeof pages === 'number') {
            await this._addPagesFromDocument(input, [pages])
        } else if (Array.isArray(pages)) {
            const pagesAsNumbers = pages.map((p) => (typeof p === 'string' ? parseInt(p.trim()) : p))
            await this._addPagesFromDocument(input, pagesAsNumbers)
        } else if (typeof pages === 'string') {
            const pagesArray = parsePagesString(pages)
            await this._addPagesFromDocument(input, pagesArray)
        } else {
            throw new Error(
                ['Invalid parameter "pages".', 'Must be a string like "1,2,3" or "1-3" or an Array of numbers.'].join(
                    ' '
                )
            )
        }
    }

    protected async _ensureDoc(): Promise<void> {
        if (!this._doc) {
            this._doc = await PDFDocument.create()
            this._doc.setProducer('pdf-merger-js')
            this._doc.setCreationDate(new Date())
        }
    }

    protected async _saveAsUint8Array(): Promise<Uint8Array> {
        await this._ensureDoc()
        return await this._doc!.save()
    }

    protected async _saveAsBase64(): Promise<string> {
        await this._ensureDoc()
        return await this._doc!.saveAsBase64({ dataUri: true })
    }

    protected async _getInputAsUint8Array(input: PdfInput): Promise<Uint8Array> {
        if (input instanceof Uint8Array) {
            return input
        }

        if (input instanceof ArrayBuffer) {
            return new Uint8Array(input)
        }

        if (Object.prototype.toString.call(input) === '[object ArrayBuffer]') {
            return new Uint8Array(input as unknown as ArrayBuffer)
        }

        if (typeof Blob !== 'undefined' && input instanceof Blob) {
            const aBuffer = await input.arrayBuffer()
            return new Uint8Array(aBuffer)
        }

        if (input instanceof URL) {
            if (typeof fetch === 'undefined') {
                throw new Error('fetch is not defined. You need to use a polyfill for this to work.')
            }
            const res = await fetch(input)
            const aBuffer = await res.arrayBuffer()
            return new Uint8Array(aBuffer)
        }

        const allowedTypes = ['Uint8Array', 'ArrayBuffer', 'File', 'Blob', 'URL']
        let errorMsg = `pdf-input must be of type ${allowedTypes.join(', ')}, a valid filename or url!`
        if (typeof input === 'string' || input instanceof String) {
            errorMsg += ` Input was "${input}" wich is not an existing file, nor a valid URL!`
        } else {
            errorMsg += ` Input was of type "${typeof input}" instead.`
        }
        throw new Error(errorMsg)
    }

    protected async _addPagesFromDocument(input: PdfInput, pages?: number[]): Promise<void> {
        const src = await this._getInputAsUint8Array(input)
        const srcDoc = await PDFDocument.load(src, this._loadOptions)

        let indices: number[] = []
        if (pages === undefined) {
            indices = srcDoc.getPageIndices()
        } else {
            indices = pages.map((p) => p - 1)
        }

        const copiedPages = await this._doc!.copyPages(srcDoc, indices)
        copiedPages.forEach((page) => {
            this._doc!.addPage(page)
        })
    }
}
