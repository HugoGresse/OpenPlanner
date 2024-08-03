import { OverwriteSpeakerSessionsType } from './overwriteSpeakerSponsors'
import { Value } from '@sinclair/typebox/value'
import { Type } from '@sinclair/typebox'
import { FormatError } from '../../other/Errors'

/**
 * Verify the data correctness before writing it to the database
 * Sessions:
 * - dates format should be ISO 8601 '2017-04-20T11:32:00.000-04:00', will be parsed using Luxon
 * - formatName require a formatId
 * - categoryName require a categoryId
 * - trackName require a trackId
 *
 * Speakers:
 * - dates format should be ISO 8601 '2017-04-20T11:32:00.000-04:00', will be parsed using Luxon
 *
 * @param overwriteData
 */
export const verifyOverwriteData = (overwriteData: OverwriteSpeakerSessionsType) => {
    for (const session of overwriteData.sessions) {
        if (session.dateStart) {
            const isValid = Value.Check(
                Type.String({
                    format: 'dateIso8601',
                }),
                session.dateStart
            )
            if (!isValid) {
                throw new FormatError(400, 'FST_ERR_VALIDATION', 'dateStart is not a valid ISO 8601 date')
            }
            const isValidDateEnd = Value.Check(
                Type.String({
                    format: 'dateIso8601',
                }),
                session.dateEnd
            )
            if (!isValidDateEnd) {
                throw new FormatError(400, 'FST_ERR_VALIDATION', 'dateEnd is not a valid ISO 8601 date')
            }

            // TODO : verify trackId, categoryId and formatId
        }
    }
}
