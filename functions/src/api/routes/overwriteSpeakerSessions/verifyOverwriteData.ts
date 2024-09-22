import { OverwriteSpeakerSessionsType } from './overwriteSpeakerSessions'
import { Value } from '@sinclair/typebox/value'
import { Type } from '@sinclair/typebox'
import { FormatError } from '../../other/Errors'
import { Category, Event, Format, Track } from '../../../types'
import { randomColor } from '../../other/randomColor'

/**
 * Verify the data correctness before writing it to the database
 * Sessions:
 * - dates format should be ISO 8601 '2017-04-20T11:32:00.000-04:00', will be parsed using Luxon
 * - formatName require a formatId
 * - categoryName require a categoryId
 * - trackName require a trackId
 *
 * @param overwriteData
 * @param event
 */
export const verifyOverwriteData = (overwriteData: OverwriteSpeakerSessionsType, event: Event) => {
    const tracksToCreates = new Map<string, Track>()
    const categoriesToCreates = new Map<string, Category>()
    const formatsToCreates = new Map<string, Format>()

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
        }

        const track = ensureIdOrNameFit(event, session.trackId, session.trackName, 'tracks')
        if (track.needToCreate) {
            tracksToCreates.set(track.id, {
                id: track.id,
                name: session.trackName || track.id,
            })
        }

        const category = ensureIdOrNameFit(event, session.categoryId, session.categoryName, 'categories')
        if (category.needToCreate) {
            categoriesToCreates.set(category.id, {
                id: category.id,
                name: session.categoryName || category.id,
                color: session.categoryColor || randomColor(),
            })
        }

        const format = ensureIdOrNameFit(event, session.formatId, session.formatName, 'formats')
        if (format.needToCreate) {
            formatsToCreates.set(format.id, {
                id: format.id,
                name: session.formatName || format.id,
                durationMinutes:
                    isNaN(<number>session.durationMinutes) || !session.durationMinutes ? 20 : session.durationMinutes,
            })
        }
    }

    return {
        tracksToCreate: Array.from(tracksToCreates.values()),
        categoriesToCreate: Array.from(categoriesToCreates.values()),
        formatsToCreate: Array.from(formatsToCreates.values()),
    }
}

const ensureIdOrNameFit = (
    event: Event,
    id: string | undefined,
    name: string | undefined,
    type: 'tracks' | 'formats' | 'categories'
):
    | {
          needToCreate: true
          id: string
      }
    | {
          needToCreate: false
          id: string | undefined
      } => {
    if (!id && !name) {
        // nothing to do
        return {
            needToCreate: false,
            id: undefined,
        }
    }

    if (!event[type]) {
        if (id) {
            return {
                needToCreate: true,
                id: id,
            }
        } else {
            throw new FormatError(
                400,
                'FST_ERR_VALIDATION',
                `${type} ${id} does not exist, and no id was provided to create it`
            )
        }
    }

    const existWithName = (event[type] || []).find((t) => t.name === name)
    const existWithId = (event[type] || []).find((t) => t.id === id)

    if (!existWithName && !existWithId) {
        if (!id) {
            throw new FormatError(
                400,
                'FST_ERR_VALIDATION',
                `${type} ${id} does not exist, and no id was provided to create it`
            )
        }

        return {
            needToCreate: true,
            id: id,
        }
    }

    return {
        needToCreate: false,
        id: existWithId ? existWithId.id : existWithName?.id,
    }
}
