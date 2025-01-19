import { Box, IconButton } from '@mui/material'
import { Social } from '../../../../types'
import TwitterIcon from '@mui/icons-material/Twitter'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import GitHubIcon from '@mui/icons-material/GitHub'
import LanguageIcon from '@mui/icons-material/Language'
import InstagramIcon from '@mui/icons-material/Instagram'
import YouTubeIcon from '@mui/icons-material/YouTube'

type SpeakerLinksProps = {
    socials: Social[]
}

const iconSize = 20

const socialIcons: Record<string, React.ReactNode> = {
    twitter: <TwitterIcon sx={{ height: iconSize, width: iconSize }} />,
    linkedin: <LinkedInIcon sx={{ height: iconSize, width: iconSize }} />,
    github: <GitHubIcon sx={{ height: iconSize, width: iconSize }} />,
    instagram: <InstagramIcon sx={{ height: iconSize, width: iconSize }} />,
    youtube: <YouTubeIcon sx={{ height: iconSize, width: iconSize }} />,
    website: <LanguageIcon sx={{ height: iconSize, width: iconSize }} />,
}

// Add a helper function to check if a URL is valid
const isValidUrl = (url: string) => {
    try {
        new URL(url)
        return true
    } catch (_) {
        return false
    }
}

// Add a helper function to reconstruct URLs
const reconstructUrl = (icon: string, link: string) => {
    if (isValidUrl(link)) return link

    switch (icon.toLowerCase()) {
        case 'github':
            return `https://github.com/${link}`
        case 'linkedin':
            return `https://linkedin.com/in/${link}`
        case 'twitter':
            return `https://x.com/${link}`
        default:
            return link
    }
}

export const SpeakerLinks = ({ socials }: SpeakerLinksProps) => {
    if (!socials || socials.length === 0) return null

    return (
        <Box sx={{ display: 'inline-flex', gap: 1, ml: 1, position: 'relative', top: 3 }}>
            {socials.map((social) => (
                <IconButton
                    key={social.icon}
                    size="small"
                    href={reconstructUrl(social.icon, social.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}>
                    {socialIcons[social.icon.toLowerCase()] || <LanguageIcon />}
                </IconButton>
            ))}
        </Box>
    )
}
