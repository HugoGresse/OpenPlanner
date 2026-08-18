import { useEffect, useState } from 'react'
import {
    Box,
    Button,
    Chip,
    Container,
    Dialog,
    Grid,
    IconButton,
    Link,
    Paper,
    Typography,
    useTheme,
} from '@mui/material'
import { ChevronLeft, ChevronRight, Close, GitHub } from '@mui/icons-material'
import { FEATURE_SECTIONS, FeatureImage, FeatureSectionContent } from './featuresContent'

const FeatureImages = ({ images, onZoom }: { images: FeatureImage[]; onZoom: (image: FeatureImage) => void }) => {
    const [index, setIndex] = useState(0)
    const image = images[index]

    return (
        <Box>
            <Paper
                elevation={6}
                sx={{ overflow: 'hidden', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box
                    component="img"
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    onClick={() => onZoom(image)}
                    sx={{ width: '100%', display: 'block', cursor: 'zoom-in' }}
                />
            </Paper>
            {images.length > 1 && (
                <Box display="flex" alignItems="center" justifyContent="center" gap={1} marginTop={1}>
                    <IconButton
                        aria-label="Previous screenshot"
                        size="small"
                        onClick={() => setIndex((index - 1 + images.length) % images.length)}>
                        <ChevronLeft />
                    </IconButton>
                    {images.map((dot, dotIndex) => (
                        <Box
                            key={dot.src}
                            onClick={() => setIndex(dotIndex)}
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                cursor: 'pointer',
                                backgroundColor: dotIndex === index ? 'primary.main' : 'action.disabled',
                            }}
                        />
                    ))}
                    <IconButton
                        aria-label="Next screenshot"
                        size="small"
                        onClick={() => setIndex((index + 1) % images.length)}>
                        <ChevronRight />
                    </IconButton>
                </Box>
            )}
        </Box>
    )
}

const FeatureSection = ({
    section,
    index,
    onZoom,
}: {
    section: FeatureSectionContent
    index: number
    onZoom: (image: FeatureImage) => void
}) => {
    const imageFirst = index % 2 === 1
    const hasImages = !!section.images?.length

    return (
        <Grid
            container
            spacing={6}
            alignItems="center"
            direction={{ xs: 'column-reverse', md: imageFirst ? 'row-reverse' : 'row' }}
            sx={{ marginBottom: 12 }}>
            <Grid item xs={12} md={hasImages ? 6 : 12}>
                <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
                    {section.title}
                </Typography>
                <Typography variant="h6" component="p" color="primary.main" gutterBottom>
                    {section.tagline}
                </Typography>
                <Box component="ul" sx={{ paddingLeft: 3, margin: 0, '& li': { marginY: 1 } }}>
                    {section.bullets.map((bullet, bulletIndex) => (
                        <Typography key={bulletIndex} component="li" variant="body1" color="text.secondary">
                            {bullet}
                        </Typography>
                    ))}
                </Box>
            </Grid>
            {hasImages && (
                <Grid item xs={12} md={6}>
                    <FeatureImages images={section.images as FeatureImage[]} onZoom={onZoom} />
                </Grid>
            )}
        </Grid>
    )
}

export const FeaturesPage = () => {
    const theme = useTheme()
    const [zoomedImage, setZoomedImage] = useState<FeatureImage | null>(null)

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
                            component="a"
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
                    <FeatureSection key={section.key} section={section} index={index} onZoom={setZoomedImage} />
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
                        <Link
                            component="a"
                            href="https://github.com/HugoGresse/openplanner"
                            target="_blank"
                            rel="noopener">
                            Contribute on GitHub
                        </Link>
                    </Typography>
                </Box>
            </Container>

            <Dialog
                open={!!zoomedImage}
                onClose={() => setZoomedImage(null)}
                maxWidth={false}
                PaperProps={{ sx: { backgroundColor: 'transparent', boxShadow: 'none', margin: 2 } }}>
                {zoomedImage && (
                    <Box position="relative" onClick={() => setZoomedImage(null)} sx={{ cursor: 'zoom-out' }}>
                        <IconButton
                            aria-label="Close fullscreen screenshot"
                            onClick={() => setZoomedImage(null)}
                            sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: 'rgba(0,0,0,0.55)',
                                color: '#FFF',
                            }}>
                            <Close />
                        </IconButton>
                        <Box
                            component="img"
                            src={zoomedImage.src}
                            alt={zoomedImage.alt}
                            sx={{
                                maxWidth: 'calc(100vw - 64px)',
                                maxHeight: 'calc(100vh - 64px)',
                                display: 'block',
                                borderRadius: 2,
                            }}
                        />
                    </Box>
                )}
            </Dialog>
        </Box>
    )
}
