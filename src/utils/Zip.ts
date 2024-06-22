/**
 * Modified from https://github.com/pwasystem/zip/blob/main/zip.js
 */
export class Zip {
    private name: string
    private zip: { [key: string]: Uint8Array & { modTime: Date | string; fileUrl: string; name?: string } }
    private file: Uint8Array[]

    constructor(name: string) {
        this.name = name
        this.zip = {}
        this.file = []
    }

    private dec2bin = (dec: number, size: number): string => dec.toString(2).padStart(size, '0')
    private str2hex = (str: string): string[] =>
        [...new TextEncoder().encode(str)].map((x) => x.toString(16).padStart(2, '0'))
    private hex2buf = (hex: string): Uint8Array => new Uint8Array(hex.split(' ').map((x) => parseInt(x, 16)))
    private bin2hex = (bin: string): string =>
        parseInt(bin.slice(8), 2).toString(16).padStart(2, '0') +
        ' ' +
        parseInt(bin.slice(0, 8), 2).toString(16).padStart(2, '0')

    private reverse = (hex: string): string => {
        let hexArray: string[] = []
        for (let i = 0; i < hex.length; i = i + 2) hexArray[i] = hex[i] + '' + hex[i + 1]
        return hexArray
            .filter((a) => a)
            .reverse()
            .join(' ')
    }

    private crc32 = (r: Uint8Array): string => {
        let o: number[] = []
        for (let c = 0; c < 256; c++) {
            let a = c
            for (let f = 0; f < 8; f++) a = 1 & a ? 3988292384 ^ (a >>> 1) : a >>> 1
            o[c] = a
        }
        let n = -1
        for (let t = 0; t < r.length; t++) n = (n >>> 8) ^ o[255 & (n ^ r[t])]
        return this.reverse(((-1 ^ n) >>> 0).toString(16).padStart(8, '0'))
    }

    private getFileExtension = (fileUrl: string, fileType: string | null): string | null => {
        if (fileType) {
            const fileTypeExtension = fileType.split('/').pop()
            if (fileTypeExtension) {
                return fileTypeExtension
            }
        }
        // Check if the file url finish with a valid extension
        const lastPath = fileUrl.split('/').pop()
        if (!lastPath) return null
        const extension = lastPath.split('.').pop()
        if (extension) {
            return extension
        }
        return null
    }

    async fetch2Zip(filesArray: { url: string; name: string }[], folder: string = ''): Promise<void> {
        for (const file of filesArray) {
            const fetchResponse = await fetch(file.url)
            const buffer = await fetchResponse.arrayBuffer()
            let uint = [...new Uint8Array(buffer)] as unknown as Uint8Array & {
                modTime: string
                fileUrl: string
            }
            uint.modTime = fetchResponse.headers.get('Last-Modified') || new Date().toUTCString()
            const fileExtension = this.getFileExtension(file.url, fetchResponse.headers.get('Content-Type'))
            uint.fileUrl = `${this.name}/${folder}${file.name}.${fileExtension || ''}`
            this.zip[file.name] = uint
        }
    }

    files2zip(files: File[], folder: string = ''): void {
        for (let i = 0; i < files.length; i++) {
            files[i].arrayBuffer().then((data) => {
                let uint = [...new Uint8Array(data)] as unknown as Uint8Array & {
                    name: string
                    modTime: Date
                    fileUrl: string
                }
                uint.name = files[i].name
                uint.modTime = new Date(files[i].lastModified)
                uint.fileUrl = `${this.name}/${folder}${files[i].name}`
                this.zip[uint.fileUrl] = uint
            })
        }
    }

    makeZip(): void {
        let count = 0
        let centralDirectoryFileHeader = ''
        let directoryInit = 0
        let offSetLocalHeader = '00 00 00 00'
        let zip = this.zip
        for (const name in zip) {
            let lastMod: Date, hour: string, minutes: string, seconds: string, year: string, month: string, day: string
            let modTime = () => {
                lastMod = new Date(zip[name].modTime)
                hour = this.dec2bin(lastMod.getHours(), 5)
                minutes = this.dec2bin(lastMod.getMinutes(), 6)
                seconds = this.dec2bin(Math.round(lastMod.getSeconds() / 2), 5)
                year = this.dec2bin(lastMod.getFullYear() - 1980, 7)
                month = this.dec2bin(lastMod.getMonth() + 1, 4)
                day = this.dec2bin(lastMod.getDate(), 5)
                return this.bin2hex(`${hour}${minutes}${seconds}`) + ' ' + this.bin2hex(`${year}${month}${day}`)
            }
            let crc = this.crc32(zip[name])
            let size = this.reverse(zip[name].length.toString(16).padStart(8, '0'))
            let nameFile = this.str2hex(zip[name].fileUrl).join(' ')
            let nameSize = this.reverse(zip[name].fileUrl.length.toString(16).padStart(4, '0'))
            let fileHeader = `50 4B 03 04 14 00 00 00 00 00 ${modTime()} ${crc} ${size} ${size} ${nameSize} 00 00 ${nameFile}`
            let fileHeaderBuffer = this.hex2buf(fileHeader)
            directoryInit = directoryInit + fileHeaderBuffer.length + zip[name].length
            centralDirectoryFileHeader = `${centralDirectoryFileHeader}50 4B 01 02 14 00 14 00 00 00 00 00 ${modTime()} ${crc} ${size} ${size} ${nameSize} 00 00 00 00 00 00 01 00 20 00 00 00 ${offSetLocalHeader} ${nameFile} `
            offSetLocalHeader = this.reverse(directoryInit.toString(16).padStart(8, '0'))
            this.file.push(fileHeaderBuffer, new Uint8Array(zip[name]))
            count++
        }
        centralDirectoryFileHeader = centralDirectoryFileHeader.trim()
        let entries = this.reverse(count.toString(16).padStart(4, '0'))
        let dirSize = this.reverse(centralDirectoryFileHeader.split(' ').length.toString(16).padStart(8, '0'))
        let dirInit = this.reverse(directoryInit.toString(16).padStart(8, '0'))
        let centralDirectory = `50 4b 05 06 00 00 00 00 ${entries} ${entries} ${dirSize} ${dirInit} 00 00`

        this.file.push(this.hex2buf(centralDirectoryFileHeader), this.hex2buf(centralDirectory))

        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([...this.file], { type: 'application/octet-stream' }))
        a.download = `${this.name}.zip`
        a.click()
    }
}
