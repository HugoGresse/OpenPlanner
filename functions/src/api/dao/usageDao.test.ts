import { describe, expect, test } from 'vitest'
import { parseCsvLine } from './usageDao'

describe('parseCsvLine', () => {
    test('parses a real usage-log line despite commas inside quoted fields', () => {
        const line =
            '"1734524400000000","203.0.113.7","GET_Object","GET","/events/evt1/photo.png","200","0","245035","1200","storage.googleapis.com","https://conf.example.com/speakers, page 2","Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0","req-1","GET_Object","conferencecenterr.appspot.com","events/evt1/photo.png"'
        const columns = parseCsvLine(line)
        expect(columns).toHaveLength(16)
        expect(columns[7]).toBe('245035')
        expect(columns[10]).toBe('https://conf.example.com/speakers, page 2')
        expect(columns[11]).toContain('KHTML, like Gecko')
        expect(columns[15]).toBe('events/evt1/photo.png')
    })

    test('handles escaped quotes and empty fields', () => {
        expect(parseCsvLine('"a","","he said ""hi""",plain')).toEqual(['a', '', 'he said "hi"', 'plain'])
    })
})
