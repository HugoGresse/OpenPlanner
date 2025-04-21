import { JobPost, Sponsor } from '../../../../types'
import { Box, Card, CardContent, CardMedia, IconButton, Link, Typography, useTheme, alpha, Button } from '@mui/material'
import { DeleteRounded } from '@mui/icons-material'
import EditIcon from '@mui/icons-material/Edit'
import WorkIcon from '@mui/icons-material/Work'
import { useMemo } from 'react'
export type SponsorItemProps = {
    sponsor: Sponsor
    categoryId: string
    onDelete: () => void
    jobPosts: JobPost[]
}

export const SponsorItem = ({ sponsor, onDelete, categoryId, jobPosts }: SponsorItemProps) => {
    const theme = useTheme()

    const jobPostsCount = useMemo(() => {
        return jobPosts.filter((jobPost) => jobPost.sponsorId === sponsor.id).length
    }, [jobPosts, sponsor.id])

    return (
        <Card
            component="li"
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                borderRadius: 2,
                marginRight: 1,
                marginTop: 1,
                backgroundColor: alpha(theme.palette.background.paper, 0.7),
                transition: 'all 0.2s ease-in-out',
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: theme.shadows[4],
                },
                maxWidth: 340,
                overflow: 'visible',
            }}>
            <CardContent
                sx={{
                    flex: '1 1 auto',
                    p: 2,
                    overflow: 'hidden',
                }}>
                <Typography variant="h6" gutterBottom component="div" noWrap>
                    {sponsor.name}
                </Typography>
                <CardMedia
                    component="img"
                    sx={{
                        width: 100,
                        height: 100,
                        objectFit: 'contain',
                        borderRadius: 1,
                        backgroundColor:
                            theme.palette.mode === 'dark'
                                ? alpha(theme.palette.common.white, 0.1)
                                : alpha(theme.palette.common.black, 0.05),
                        padding: 1,
                    }}
                    image={sponsor.logoUrl}
                    alt={sponsor.name}
                />
                <Button
                    component={Link}
                    href={`/jobposts?sponsorId=${sponsor.id}`}
                    startIcon={<WorkIcon />}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}>
                    {jobPostsCount} jobs
                </Button>
            </CardContent>

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                    borderLeft: `1px solid ${theme.palette.divider}`,
                    p: 1,
                    width: 50,
                }}>
                <IconButton
                    aria-label="Edit sponsor"
                    component={Link}
                    href={`/sponsors/${sponsor.id}?categoryId=${categoryId}`}
                    size="small"
                    sx={{
                        mb: 1,
                        color: theme.palette.primary.main,
                    }}>
                    <EditIcon />
                </IconButton>
                <IconButton
                    aria-label="Delete sponsor"
                    onClick={onDelete}
                    size="small"
                    sx={{
                        color: theme.palette.error.main,
                    }}>
                    <DeleteRounded />
                </IconButton>
            </Box>
        </Card>
    )
}
