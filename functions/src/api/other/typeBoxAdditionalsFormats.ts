import { FormatRegistry } from '@sinclair/typebox'
import { DateTime } from 'luxon'

// Not working, it seems even if we import this, the format is not registered and when the function is called, it crashed directly
FormatRegistry.Set('dateIso8601', function (value: string) {
    // Doc : https://moment.github.io/luxon/#/parsing?id=iso-8601
    try {
        const result = DateTime.fromISO(value)

        if (result.isValid) {
            return true
        }
    } catch (error) {
        // Do nothing
        console.warn('DateTime.fromISO failed', error)
    }
    return false
})
