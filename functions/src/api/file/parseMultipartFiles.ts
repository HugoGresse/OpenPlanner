import os from 'os'
import Busboy from '@fastify/busboy'
import path from 'path'
import fs from 'fs'
import { IncomingMessage } from 'http'

export function extractMultipartFormData(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        if (req.method != 'POST') {
            return reject(405)
        } else {
            const busboy = new Busboy({ headers: req.headers as any, limits: { files: 5, fileSize: 1024 * 1024 * 10 } })
            const tmpdir = os.tmpdir()
            const fields: { [key: string]: string } = {}
            const fileWrites: Array<Promise<any>> = []
            const uploads: { [key: string]: string } = {}

            busboy.on('field', (fieldname: string, val: string) => (fields[fieldname] = val))

            busboy.on('file', (fieldname: string, file, filename: string) => {
                const filepath = path.join(tmpdir, filename)
                const writeStream = fs.createWriteStream(filepath)

                uploads[fieldname] = filepath

                file.pipe(writeStream)

                const promise = new Promise((resolve, reject) => {
                    file.on('end', () => {
                        writeStream.end()
                    })
                    writeStream.on('finish', resolve)
                    writeStream.on('error', reject)
                })

                fileWrites.push(promise)
            })

            busboy.on('finish', async () => {
                const uploadsOut: { [key: string]: Buffer } = {}
                const result = { fields, uploads: uploadsOut }

                await Promise.all(fileWrites)

                for (const file in uploads) {
                    const filename = uploads[file]

                    if (!fs.existsSync(filename)) {
                        continue
                    }
                    result.uploads[file] = fs.readFileSync(filename)
                    fs.unlinkSync(filename)
                }
                resolve(result)
            })

            busboy.on('error', reject)

            if ((req as any).rawBody) {
                busboy.end((req as any).rawBody)
            } else {
                req.pipe(busboy)
            }
        }
    })
}
