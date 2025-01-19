import { Box, Link as MuiLink } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Link } from 'wouter'

type BackToScheduleProps = {
    to: string
}

export const BackToSchedule = ({ to }: BackToScheduleProps) => (
    <Box sx={{ mb: 2 }}>
        <MuiLink
            component={Link}
            to={to}
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': { color: 'primary.main' },
            }}>
            <ArrowBackIcon fontSize="small" />
            Back to Schedule
        </MuiLink>
    </Box>
)
