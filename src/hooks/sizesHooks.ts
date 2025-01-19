import { useMediaQuery, useTheme } from '@mui/material'

export const isMobile = () => {
    const theme = useTheme()
    return useMediaQuery(theme.breakpoints.down('sm'))
}
