import { Social } from '../../types'

type SocialInput = { name: string; icon?: string; link: string }

// Derive the icon from the network name when the client did not send one.
export const withSocialIcons = (socials: SocialInput[]): Social[] =>
    socials.map((social) => ({
        name: social.name,
        icon: social.icon || social.name.toLowerCase().trim().replace(/\s+/g, '-'),
        link: social.link,
    }))
