import { JsonSession, JsonSpeaker } from '../../../events/actions/updateWebsiteActions/jsonTypes'
import { Category, Track } from '../../../types'

export type PublicTalkDetailProps = {
    session: JsonSession & { speakersData?: JsonSpeaker[] }
    categories: Category[]
    tracks: Track[]
}

export type { JsonSpeaker, Category }
