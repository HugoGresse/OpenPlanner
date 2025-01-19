import { Box, Typography, Chip, Link as MuiLink } from '@mui/material'
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

type ResourceLinksProps = {
    presentationLink: string | null | undefined
    videoLink: string | null | undefined
}

export const ResourceLinks = ({ presentationLink, videoLink }: ResourceLinksProps) => {
    if (!presentationLink && !videoLink) return null

    return (
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            {presentationLink && (
                <MuiLink
                    href={presentationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textDecoration: 'none' }}>
                    <Chip icon={<PictureAsPdfIcon />} label="Presentation" clickable color="primary" />
                </MuiLink>
            )}
            {videoLink && (
                <MuiLink href={videoLink} target="_blank" rel="noopener noreferrer" sx={{ textDecoration: 'none' }}>
                    <Chip icon={<VideoLibraryIcon />} label="Video Recording" clickable color="primary" />
                </MuiLink>
            )}
        </Box>
    )
}
