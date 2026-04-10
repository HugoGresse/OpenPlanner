import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Slider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
import { Event, Speaker } from '../../../../types'
import { useResizeSpeakerAvatars } from '../../../actions/speakers/useResizeSpeakerAvatars'

const DEFAULT_MAX_SIZE = 400

const formatDimensions = (width: number, height: number) => `${width}×${height}px`

const getSizeChipColor = (
    width: number,
    height: number,
    maxSize: number
): 'default' | 'warning' | 'error' => {
    const largest = Math.max(width, height)
    if (largest > maxSize * 2) return 'error'
    if (largest > maxSize) return 'warning'
    return 'default'
}

export const SpeakerAvatarSizeDialog = ({
    isOpen,
    onClose,
    event,
    speakers,
}: {
    isOpen: boolean
    onClose: () => void
    event: Event
    speakers: Speaker[]
}) => {
    const [maxSize, setMaxSize] = useState(DEFAULT_MAX_SIZE)
    const { avatarInfos, resizeProgress, resizeAllAvatars, isFilesLoading } = useResizeSpeakerAvatars(
        event,
        speakers
    )

    const speakersWithPhotos = avatarInfos.filter((info) => info.speaker.photoUrl)
    const speakersNeedingResize = speakersWithPhotos.filter(
        (info) =>
            info.imageInfo &&
            Math.max(info.imageInfo.width, info.imageInfo.height) > maxSize
    )

    const handleResize = () => {
        resizeAllAvatars(maxSize)
    }

    return (
        <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth scroll="body" aria-labelledby="avatar-size-dialog-title">
            <DialogTitle id="avatar-size-dialog-title">Speaker Avatar Sizes</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    View and reduce the size of all speaker avatars. Images larger than the selected max
                    dimension will be highlighted.
                </Typography>

                <Box mb={3}>
                    <Typography gutterBottom>
                        Max dimension: <strong>{maxSize}px</strong>
                    </Typography>
                    <Slider
                        value={maxSize}
                        onChange={(_, value) => setMaxSize(value as number)}
                        min={100}
                        max={1000}
                        step={50}
                        marks={[
                            { value: 100, label: '100' },
                            { value: 400, label: '400' },
                            { value: 700, label: '700' },
                            { value: 1000, label: '1000' },
                        ]}
                        disabled={resizeProgress.isLoading}
                        sx={{ maxWidth: 400 }}
                    />
                </Box>

                {resizeProgress.isLoading && (
                    <Box mb={2}>
                        <Typography variant="body2" gutterBottom>
                            Resizing {resizeProgress.progress}/{resizeProgress.total} avatars…
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={
                                resizeProgress.total > 0
                                    ? (resizeProgress.progress / resizeProgress.total) * 100
                                    : 0
                            }
                        />
                    </Box>
                )}

                {resizeProgress.errors.length > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {resizeProgress.errors.map((err, i) => (
                            <div key={i}>{err}</div>
                        ))}
                    </Alert>
                )}

                {!resizeProgress.isLoading && resizeProgress.total > 0 && resizeProgress.errors.length === 0 && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        All avatars have been resized successfully.
                    </Alert>
                )}

                <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Button
                        variant="contained"
                        onClick={handleResize}
                        disabled={
                            resizeProgress.isLoading ||
                            isFilesLoading ||
                            speakersNeedingResize.length === 0
                        }>
                        Resize {speakersNeedingResize.length} avatar
                        {speakersNeedingResize.length !== 1 ? 's' : ''} to ≤{maxSize}px
                    </Button>
                    {isFilesLoading && <CircularProgress size={20} />}
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Avatar</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Dimensions</TableCell>
                                <TableCell>Type</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {speakersWithPhotos.map(({ speaker, imageInfo, isLoading, error }) => {
                                const largest = imageInfo
                                    ? Math.max(imageInfo.width, imageInfo.height)
                                    : 0
                                const chipColor = imageInfo
                                    ? getSizeChipColor(imageInfo.width, imageInfo.height, maxSize)
                                    : 'default'

                                return (
                                    <TableRow key={speaker.id}>
                                        <TableCell>
                                            <Avatar
                                                src={speaker.photoUrl || undefined}
                                                alt={speaker.name}
                                                sx={{ width: 40, height: 40 }}
                                            />
                                        </TableCell>
                                        <TableCell>{speaker.name}</TableCell>
                                        <TableCell>
                                            {isLoading && <CircularProgress size={16} />}
                                            {error && (
                                                <Typography variant="caption" color="error">
                                                    Error
                                                </Typography>
                                            )}
                                            {imageInfo && !isLoading && (
                                                <Chip
                                                    label={formatDimensions(imageInfo.width, imageInfo.height)}
                                                    color={chipColor}
                                                    size="small"
                                                    variant={largest > maxSize ? 'filled' : 'outlined'}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {imageInfo?.fileType && (
                                                <Typography variant="caption">
                                                    {imageInfo.fileType.replace('image/', '')}
                                                </Typography>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {speakersWithPhotos.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        <Typography variant="body2" color="text.secondary">
                                            No speakers with avatars found.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box mt={2} display="flex" justifyContent="flex-end">
                    <Button onClick={onClose}>Close</Button>
                </Box>
            </DialogContent>
        </Dialog>
    )
}
