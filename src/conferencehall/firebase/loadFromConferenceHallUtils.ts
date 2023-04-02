import { getConferenceHallSpeakers } from './getConferenceHallSpeakers'
import { ConferenceHallProposal, ConferenceHallSpeaker } from '../../types'

export const loadConferenceHallSpeakers = async (
    proposals: ConferenceHallProposal[] = [],
    progress: (progress: string) => void
): Promise<[speakersMap: { [id: string]: ConferenceHallSpeaker }, errors: string[], speakersIds: string[]]> => {
    const chSpeakerIds = proposals.reduce<string[]>((acc, proposal) => {
        const chSpeakers = Object.keys(proposal.speakers).filter((id) => proposal.speakers[id])
        acc.push(...chSpeakers)
        return acc
    }, [])
    return await loadConferenceHallSpeakersFromIds(chSpeakerIds, progress)
}

export const loadConferenceHallSpeakersFromIds = async (
    conferenceHallSpeakerIds: string[],
    progress: (progress: string) => void
): Promise<[speakersMap: { [id: string]: ConferenceHallSpeaker }, errors: string[], speakersIds: string[]]> => {
    const uniqConferenceHallSpeakersIds = [...new Set(conferenceHallSpeakerIds)]
    progress(`Getting ${uniqConferenceHallSpeakersIds.length} ConferenceHall speakers...`)
    const [speakersMap, getSpeakersError] = await getConferenceHallSpeakers(uniqConferenceHallSpeakersIds, progress)

    return [speakersMap, getSpeakersError, uniqConferenceHallSpeakersIds]
}
