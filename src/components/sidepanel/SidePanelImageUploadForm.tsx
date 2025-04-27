import { Box, Button, Typography, useTheme } from '@mui/material'
import * as React from 'react'
import { LoadingButton } from '@mui/lab'
import { TextFieldElement, useWatch } from 'react-hook-form-mui'
import { Download, Crop } from '@mui/icons-material'
import { triggerFileDownload } from '../../utils/triggerFileDownload'
import { ImageCropDialog, CroppedImageFile } from './ImageCropDialog'

export type SidePanelImageUploadFormProps = {
    fieldName: string
    helpText: string

    isDragActive: boolean
    uploading: boolean
    file: { file: File; preview: string } | null
    getInputProps: () => any
    onInputClick: () => void
    onSaveClick: () => void
    onImageChange?: (file: File, preview: string) => void
    disabled?: boolean
}
export const SidePanelImageUploadForm = ({
    fieldName,
    file,
    helpText,
    isDragActive,
    getInputProps,
    onInputClick,
    onSaveClick,
    uploading,
    onImageChange,
    disabled = false,
}: SidePanelImageUploadFormProps) => {
    const theme = useTheme()
    const fieldValue = useWatch({ name: fieldName })
    const [previewImage, setPreviewImage] = React.useState<string>((file && file.preview) || fieldValue)
    const [cropDialogOpen, setCropDialogOpen] = React.useState(false)

    // Update previewImage when file or fieldValue changes
    React.useEffect(() => {
        setPreviewImage((file && file.preview) || fieldValue)
    }, [file, fieldValue])

    const handleOpenCropDialog = () => {
        setCropDialogOpen(true)
    }

    const handleCloseCropDialog = () => {
        setCropDialogOpen(false)
    }

    const handleApplyCrop = (croppedImage: CroppedImageFile) => {
        // Update the preview image with the cropped version
        setPreviewImage(croppedImage.dataUrl)

        // Notify parent component with the file and preview
        if (onImageChange) {
            onImageChange(croppedImage.file, croppedImage.dataUrl)
        }
    }

    return (
        <>
            <Typography>{helpText}</Typography>

            <Box
                sx={{
                    border: `2px dashed ${isDragActive ? '#55F' : '#999'}`,
                    color: '#666',
                    background: 'rgba(0,0,0,0.04)',
                    transition: 'all 300ms',
                    borderRadius: 4,
                    textAlign: 'center',
                    padding: 1,
                    marginTop: 1,
                    marginBottom: 1,
                    opacity: disabled ? 0.5 : 1,
                    pointerEvents: disabled ? 'none' : 'auto',
                }}
                onClick={onInputClick}>
                <input {...getInputProps()} />
                {isDragActive ? (
                    <Box sx={{}}>
                        <Typography>Drop the image here to upload it instantly</Typography>
                    </Box>
                ) : (
                    <Typography>Drag & drop image here</Typography>
                )}

                {!isDragActive && <Button sx={{}}>Upload image</Button>}
            </Box>

            <Box
                sx={{
                    borderTop: '1px solid #DDD',
                    lineHeight: 0,
                    marginY: 2,
                    textAlign: 'center',
                    '& span': {
                        backgroundColor: theme.palette.background.paper,
                        color: '#BBB',
                        padding: 1,
                    },
                }}>
                <span>OR</span>
            </Box>

            <TextFieldElement
                margin="dense"
                fullWidth
                label="Image URL"
                name={fieldName}
                variant="filled"
                size="small"
                disabled={disabled}
            />

            {previewImage && (
                <>
                    <Box
                        sx={{
                            borderRadius: 1,
                            border: '4px solid #EEE',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            marginTop: 4,
                            marginBottom: 2,
                            width: '100%',
                            '& img': {
                                maxWidth: '100%',
                                display: 'block',
                            },
                        }}>
                        <Typography>Preview</Typography>
                        <Box
                            sx={{
                                width: '100%',
                                backgroundImage:
                                    'linear-gradient(45deg, #BBB 25%, transparent 25%), linear-gradient(-45deg, #BBB 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #BBB 75%), linear-gradient(-45deg, transparent 75%, #BBB 75%), linear-gradient(0deg, #FFFFFF 0%, #FFFFFF 100%)',
                                backgroundSize: '20px 20px',
                                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                            }}>
                            <img src={previewImage} alt="" width="100%" />
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Button
                            sx={{
                                flex: 1,
                            }}
                            variant="outlined"
                            endIcon={<Download />}
                            onClick={async () => {
                                await triggerFileDownload(previewImage, `${'OpenPlanner'}`)
                            }}>
                            Download
                        </Button>
                        <Button
                            sx={{
                                flex: 1,
                            }}
                            variant="outlined"
                            endIcon={<Crop />}
                            onClick={handleOpenCropDialog}>
                            Crop
                        </Button>
                    </Box>

                    <ImageCropDialog
                        open={cropDialogOpen}
                        onClose={handleCloseCropDialog}
                        imageSrc={previewImage}
                        onApplyCrop={handleApplyCrop}
                    />
                </>
            )}

            <LoadingButton
                variant="contained"
                onClick={onSaveClick}
                disabled={uploading || disabled}
                loading={uploading}>
                Upload image
            </LoadingButton>
        </>
    )
}
