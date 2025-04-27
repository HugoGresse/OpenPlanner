import { Box, Typography } from '@mui/material'
import { useOSSSponsors } from '../services/hooks/useOSSSponsors'

export const OSSSponsor = () => {
    const sponsors = useOSSSponsors()

    return (
        <>
            <Box
                display="flex"
                alignItems="center"
                sx={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%23555' stroke-width='3' stroke-dasharray='4%2c 8' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`,
                    ':hover': {
                        filter: 'brightness(150%)',
                    },
                }}
                borderRadius={2}
                padding={2}
                marginBottom={2}
                justifyContent="center"
                color="#999"
                component="a"
                target="_blank"
                href="https://github.com/sponsors/HugoGresse">
                <Typography>Become a sponsor</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2} justifyContent="space-evenly">
                {sponsors.map((sponsor) => (
                    <Box
                        component="a"
                        href={sponsor.website}
                        target="_blank"
                        key={sponsor.name}
                        sx={{
                            ':hover': { opacity: 0.4 },
                        }}>
                        <img
                            src={sponsor.logoDark || sponsor.logo}
                            alt={sponsor.name}
                            style={{
                                height: 30,
                                borderRadius: 5,
                            }}
                        />
                    </Box>
                ))}
            </Box>
        </>
    )
}
