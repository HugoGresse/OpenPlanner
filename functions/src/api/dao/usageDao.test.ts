import { describe, expect, test } from 'vitest'
import { parseUsageLogContent } from './usageDao'

const HEADER =
    '"time_micros","c_ip","c_ip_type","c_ip_region","cs_method","cs_uri","sc_status","cs_bytes","sc_bytes","time_taken_micros","cs_host","cs_referer","cs_user_agent","s_request_id","cs_operation","cs_bucket","cs_object"'

describe('parseUsageLogContent', () => {
    test('extracts event rows despite commas inside quoted fields', () => {
        const line =
            '"1734524400000000","203.0.113.7","1","","GET","/events/evt1/photo.png","200","0","245035","1200","storage.googleapis.com","https://conf.example.com/speakers, page 2","Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0","req-1","GET_Object","conferencecenterr.appspot.com","events/evt1/photo.png"'
        const other =
            '"1734524400000001","203.0.113.8","1","","GET","/robots.txt","404","0","120","900","storage.googleapis.com","","curl/8.0","req-2","GET_Object","conferencecenterr.appspot.com","robots.txt"'
        const rows = parseUsageLogContent([HEADER, line, other].join('\n'), '2026-08-19')
        expect(rows).toEqual([{ date: '2026-08-19', eventId: 'evt1', bytes: 245035 }])
    })

    test('returns empty for header-only or malformed content', () => {
        expect(parseUsageLogContent(HEADER, '2026-08-19')).toEqual([])
        expect(parseUsageLogContent('"a","b"\n"1","2"', '2026-08-19')).toEqual([])
    })
})
