import { useEffect } from 'react'
import { Box, Button, Chip, Container, Grid, Link, Paper, Typography, useTheme } from '@mui/material'
import { GitHub } from '@mui/icons-material'
import { FEATURE_SECTIONS, FeatureSectionContent } from './featuresContent'

const FeatureSection = ({ section, index }: { section: FeatureSectionContent; index: number }) => {
    const imageFirst = index % 2 === 1

    const text = (
        <Grid item xs={12} md={section.image ? 6 : 12}>
            <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
                {section.title}
            </Typography>
            <Typography variant="h6" component="p" color="primary.main" gutterBottom>
                {section.tagline}
            </Typography>
            <Box component="ul" sx={{ paddingLeft: 3, margin: 0, '& li': { marginY: 1 } }}>
                {section.bullets.map((bullet) => (
                    <Typography key={bullet} component="li" variant="body1" color="text.secondary">
                        {bullet}
                    </Typography>
                ))}
            </Box>
        </Grid>
    )

    const image = section.image ? (
        <Grid item xs={12} md={6}>
            <Paper
                elevation={6}
                sx={{ overflow: 'hidden', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box
                    component="img"
                    src={section.image}
                    alt={section.imageAlt || section.title}
                    loading="lazy"
                    sx={{ width: '100%', display: 'block' }}
                />
            </Paper>
        </Grid>
    ) : null

    return (
        <Grid
            container
            spacing={6}
            alignItems="center"
            direction={{ xs: 'column-reverse', md: imageFirst ? 'row-reverse' : 'row' }}
            sx={{ marginBottom: 12 }}>
            {text}
            {image}
        </Grid>
    )
}

export const FeaturesPage = () => {
    const theme = useTheme()

    useEffect(() => {
        document.title = 'OpenPlanner | Features'
    }, [])

    return (
        <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
            <Container maxWidth="lg" sx={{ paddingY: { xs: 6, md: 10 } }}>
                <Box textAlign="center" marginBottom={12}>
                    <Box
                        component="img"
                        src={
                            theme.palette.mode === 'light' ? '/logos/open-planner.svg' : '/logos/open-planner-light.svg'
                        }
                        alt="OpenPlanner"
                        sx={{ height: 90, marginBottom: 3 }}
                    />
                    <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
                        Everything you need to run a conference
                    </Typography>
                    <Typography variant="h6" component="p" color="text.secondary" maxWidth="sm" marginX="auto">
                        OpenPlanner is a free and open source platform to plan a conference and run the live show:
                        talks, speakers, sponsors, schedule, and day-of tooling.
                    </Typography>
                    <Box marginTop={4} display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                        <Button variant="contained" size="large" href="/">
                            Open the app
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<GitHub />}
                            href="https://github.com/HugoGresse/openplanner"
                            target="_blank"
                            rel="noopener">
                            Star on GitHub
                        </Button>
                    </Box>
                    <Box marginTop={3} display="flex" gap={1} justifyContent="center" flexWrap="wrap">
                        {['Free & open source', 'ConferenceHall import', 'Static JSON API', 'Live transcription'].map(
                            (label) => (
                                <Chip key={label} label={label} variant="outlined" size="small" />
                            )
                        )}
                    </Box>
                </Box>

                {FEATURE_SECTIONS.map((section, index) => (
                    <FeatureSection key={section.key} section={section} index={index} />
                ))}

                <Box textAlign="center" paddingY={6}>
                    <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
                        Plan your next event with OpenPlanner
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                        No pricing page — it is open source. Sign in and create your event.
                    </Typography>
                    <Box marginTop={3} display="flex" gap={2} justifyContent="center">
                        <Button variant="contained" size="large" href="/">
                            Get started
                        </Button>
                    </Box>
                    <Typography variant="body2" color="text.secondary" marginTop={6}>
                        Built by organizers, for organizers.{' '}
                        <Link href="https://github.com/HugoGresse/openplanner" target="_blank" rel="noopener">
                            Contribute on GitHub
                        </Link>
                    </Typography>
                </Box>
            </Container>
        </Box>
    )
}
