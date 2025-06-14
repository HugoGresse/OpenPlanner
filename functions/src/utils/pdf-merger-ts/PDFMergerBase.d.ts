import { PDFDocument, LoadOptions } from 'pdf-lib'

export interface Metadata {
    producer?: string
    author?: string
    title?: string
    creator?: string
}

export type PdfInput = Uint8Array | ArrayBuffer | Blob | URL

export default class PDFMergerBase {
    protected _doc?: PDFDocument
    protected _loadOptions: LoadOptions

    constructor()
    reset(): void
    setMetadata(metadata: Metadata): Promise<void>
    add(input: PdfInput, pages?: string | string[] | number | number[] | undefined | null): Promise<void>
    protected _ensureDoc(): Promise<void>
    protected _saveAsUint8Array(): Promise<Uint8Array>
    protected _saveAsBase64(): Promise<string>
    protected _getInputAsUint8Array(input: PdfInput): Promise<Uint8Array>
    protected _addPagesFromDocument(input: PdfInput, pages?: number[]): Promise<void>
}
