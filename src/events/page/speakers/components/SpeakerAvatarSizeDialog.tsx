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

/** Default max file size threshold in kilobytes */
const DEFAULT_MAX_SIZE_KB = 200

const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    return `${Math.round(bytes / 1024)} KB`
}

const getSizeChipColor = (bytes: number, maxSizeKB: number): 'default' | 'warning' | 'error' => {
    const maxBytes = maxSizeKB * 1024
    if (bytes > maxBytes * 3) return 'error'
    if (bytes > maxBytes) return 'warning'
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
    const [maxSizeKB, setMaxSizeKB] = useState(DEFAULT_MAX_SIZE_KB)
    const { avatarInfos, resizeProgress, resizeAllAvatars, isFilesLoading } = useResizeSpeakerAvatars(
        event,
        speakers
    )

    const speakersWithPhotos = avatarInfos.filter((info) => info.speaker.photoUrl)
    const speakersNeedingResize = speakersWithPhotos.filter(
        (info) =>
            info.imageInfo?.fileSize !== null &&
            info.imageInfo?.fileSize !== undefined &&
            info.imageInfo.fileSize > maxSizeKB * 1024
    )

    const handleResize = () => {
        resizeAllAvatars(maxSizeKB)
    }

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            scroll="body"
            aria-labelledby="avatar-size-dialog-title">
            <DialogTitle id="avatar-size-dialog-title">Speaker Avatar Sizes</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    View the file size of all speaker avatars. Avatars exceeding the selected threshold will
                    be highlighted and can be compressed in-browser.
                </Typography>

                <Box mb={3}>
                    <Typography gutterBottom>
                        Max file size threshold: <strong>{maxSizeKB} KB</strong>
                    </Typography>
                    <Slider
                        value={maxSizeKB}
                        onChange={(_, value) => setMaxSizeKB(value as number)}
                        min={50}
                        max={1000}
                        step={50}
                        marks={[
                            { value: 50, label: '50 KB' },
                            { value: 200, label: '200 KB' },
                            { value: 500, label: '500 KB' },
                            { value: 1000, label: '1 MB' },
                        ]}
                        disabled={resizeProgress.isLoading}
                        sx={{ maxWidth: 450 }}
                    />
                </Box>

                {resizeProgress.isLoading && (
                    <Box mb={2}>
                        <Typography variant="body2" gutterBottom>
                            Compressing {resizeProgress.progress}/{resizeProgress.total} avatars…
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
                        All avatars have been compressed successfully.
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
                        Compress {speakersNeedingResize.length} avatar
                        {speakersNeedingResize.length !== 1 ? 's' : ''} above {maxSizeKB} KB
                    </Button>
                    {isFilesLoading && <CircularProgress size={20} />}
                </Box>

                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Avatar</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>File size</TableCell>
                                <TableCell>Type</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {speakersWithPhotos.map(({ speaker, imageInfo, isLoading, error }) => {
                                const fileSize = imageInfo?.fileSize ?? null
                                const chipColor =
                                    fileSize !== null ? getSizeChipColor(fileSize, maxSizeKB) : 'default'
                                const exceedsLimit = fileSize !== null && fileSize > maxSizeKB * 1024

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
                                            {!isLoading && fileSize !== null && (
                                                <Chip
                                                    label={formatFileSize(fileSize)}
                                                    color={chipColor}
                                                    size="small"
                                                    variant={exceedsLimit ? 'filled' : 'outlined'}
                                                />
                                            )}
                                            {!isLoading && fileSize === null && !error && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Unknown
                                                </Typography>
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
