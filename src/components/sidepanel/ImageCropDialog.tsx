import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import React, { useState, useRef, useEffect } from 'react'
import { cropJpegImage, cropPngImage, cropSvgImage, detectImageType } from '../../utils/imageCropUtils'

// Define a more complete file type to return
export type CroppedImageFile = {
    dataUrl: string
    file: File
    type: string
    name: string
    size: number
}

export type ImageCropDialogProps = {
    open: boolean
    onClose: () => void
    imageSrc: string
    onApplyCrop?: (croppedImageFile: CroppedImageFile) => void
}

export const ImageCropDialog = ({ open, onClose, imageSrc, onApplyCrop }: ImageCropDialogProps) => {
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
    const [imageType, setImageType] = useState<'jpeg' | 'png' | 'svg' | 'unknown'>('unknown')
    const [isProcessing, setIsProcessing] = useState(false)
    const [imageName, setImageName] = useState('image') // Default name

    const imageRef = useRef<HTMLImageElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Detect image type and name when imageSrc changes
    useEffect(() => {
        setImageType(detectImageType(imageSrc))

        // Extract name from URL if possible
        if (imageSrc.startsWith('data:')) {
            setImageName('cropped-image')
        } else {
            try {
                const url = new URL(imageSrc)
                const pathParts = url.pathname.split('/')
                const fileName = pathParts[pathParts.length - 1]
                if (fileName) {
                    // Remove file extension
                    const nameWithoutExt = fileName.split('.')[0]
                    setImageName(nameWithoutExt || 'cropped-image')
                }
            } catch (e) {
                setImageName('cropped-image')
            }
        }
    }, [imageSrc])

    // Initialize crop area when image loads
    useEffect(() => {
        if (imageLoaded && imageRef.current) {
            // Special handling for SVGs
            if (imageType === 'svg') {
                // Get the SVG's viewBox if available
                const svgElement = imageRef.current.naturalWidth === 0 ? document.querySelector('svg') : null

                let svgWidth = imageRef.current.width
                let svgHeight = imageRef.current.height

                // If we found an SVG element and it has a viewBox, use those dimensions
                if (svgElement && svgElement.getAttribute('viewBox')) {
                    const viewBox = svgElement.getAttribute('viewBox')?.split(' ')
                    if (viewBox && viewBox.length === 4) {
                        const [, , vbWidth, vbHeight] = viewBox.map(Number)
                        if (!isNaN(vbWidth) && !isNaN(vbHeight)) {
                            // Use viewBox dimensions but maintain aspect ratio
                            const aspectRatio = vbWidth / vbHeight
                            if (aspectRatio > 1) {
                                svgWidth = imageRef.current.width
                                svgHeight = imageRef.current.width / aspectRatio
                            } else {
                                svgHeight = imageRef.current.height
                                svgWidth = imageRef.current.height * aspectRatio
                            }
                        }
                    }
                }

                // Set crop to 95% of SVG dimensions
                const width = svgWidth * 0.95
                const height = svgHeight * 0.95
                const x = (svgWidth - width) / 2
                const y = (svgHeight - height) / 2
                setCrop({ x, y, width, height })
            } else {
                // Regular handling for other image types
                const width = imageRef.current.width * 0.95
                const height = imageRef.current.height * 0.95
                const x = (imageRef.current.width - width) / 2
                const y = (imageRef.current.height - height) / 2
                setCrop({ x, y, width, height })
            }
        }
    }, [imageLoaded, imageType])

    // Handle image load
    const handleImageLoad = () => {
        if (imageRef.current) {
            setImageSize({
                width: imageRef.current.width,
                height: imageRef.current.height,
            })
            setImageLoaded(true)
        }
    }

    // Mouse events for crop area manipulation
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Check if click is inside crop area
        if (x >= crop.x && x <= crop.x + crop.width && y >= crop.y && y <= crop.y + crop.height) {
            setIsDragging(true)
            setDragStart({ x: x - crop.x, y: y - crop.y })
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left - dragStart.x
        const y = e.clientY - rect.top - dragStart.y

        // Constrain to image boundaries
        const newX = Math.max(0, Math.min(x, imageSize.width - crop.width))
        const newY = Math.max(0, Math.min(y, imageSize.height - crop.height))

        setCrop((prev) => ({ ...prev, x: newX, y: newY }))
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    // Convert a data URL to a File object with error handling and validation
    const dataURLtoFile = (dataUrl: string, fileName: string, type: string): File => {
        try {
            // Validate data URL format
            if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
                throw new Error('Invalid data URL format')
            }

            const [header, base64Data] = dataUrl.split(',')

            if (!base64Data) {
                throw new Error('Invalid data URL: missing base64 data')
            }

            // Extract MIME type or use provided fallback
            const mime = header.match(/:(.*?);/)?.[1] || type

            // Convert base64 to binary using the modern decode method if available
            let binaryData: Uint8Array

            // Use modern base64 decoding when available
            if (typeof window !== 'undefined' && window.atob) {
                const binaryString = window.atob(base64Data)
                binaryData = Uint8Array.from(Array.from(binaryString).map((char) => char.charCodeAt(0)))
            } else {
                throw new Error('Base64 decoding is not supported in this environment')
            }

            // Create file with more metadata
            return new File([binaryData], fileName, {
                type: mime,
                lastModified: Date.now(),
            })
        } catch (error) {
            console.error('Error converting data URL to File:', error)
            // Create an empty placeholder file rather than failing completely
            return new File([], fileName, { type })
        }
    }

    // Apply the crop based on image type
    const handleApplyCrop = async () => {
        if (!imageRef.current) return

        setIsProcessing(true)
        try {
            let croppedImageData = ''
            let mimeType = 'image/png' // Default

            // Use different cropping method based on image type
            switch (imageType) {
                case 'jpeg':
                    croppedImageData = cropJpegImage(imageRef.current, crop)
                    mimeType = 'image/jpeg'
                    break
                case 'png':
                    croppedImageData = cropPngImage(imageRef.current, crop)
                    mimeType = 'image/png'
                    break
                case 'svg':
                    croppedImageData = await cropSvgImage(imageSrc, crop, {
                        width: imageSize.width,
                        height: imageSize.height,
                    })
                    mimeType = 'image/svg+xml'
                    break
                default:
                    // Fallback to PNG for unknown types
                    croppedImageData = cropPngImage(imageRef.current, crop)
                    mimeType = 'image/png'
            }

            if (onApplyCrop && croppedImageData) {
                // Create a proper filename based on original name and type
                const extension = mimeType.split('/')[1]
                const fileName = `${imageName}-cropped.${extension}`

                // Create a File object from the data URL
                const file = dataURLtoFile(croppedImageData, fileName, mimeType)

                // Create the complete cropped image file object
                const croppedImageFile: CroppedImageFile = {
                    dataUrl: croppedImageData,
                    file: file,
                    type: mimeType,
                    name: fileName,
                    size: file.size,
                }

                // Pass the complete file information to the callback
                onApplyCrop(croppedImageFile)
            }

            onClose()
        } catch (error) {
            console.error('Error applying crop:', error)
        } finally {
            setIsProcessing(false)
        }
    }

    // Resize crop area
    const handleResize = (direction: string, e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const startX = e.clientX
        const startY = e.clientY
        const startCrop = { ...crop }

        const handleResizeMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX
            const deltaY = moveEvent.clientY - startY

            let newCrop = { ...startCrop }

            switch (direction) {
                case 'se':
                    newCrop.width = Math.max(50, Math.min(startCrop.width + deltaX, imageSize.width - startCrop.x))
                    newCrop.height = Math.max(50, Math.min(startCrop.height + deltaY, imageSize.height - startCrop.y))
                    break
                case 'sw':
                    const newWidthSw = Math.max(50, startCrop.width - deltaX)
                    const newXSw = startCrop.x + startCrop.width - newWidthSw
                    if (newXSw >= 0) {
                        newCrop.x = newXSw
                        newCrop.width = newWidthSw
                    }
                    newCrop.height = Math.max(50, Math.min(startCrop.height + deltaY, imageSize.height - startCrop.y))
                    break
                case 'ne':
                    newCrop.width = Math.max(50, Math.min(startCrop.width + deltaX, imageSize.width - startCrop.x))
                    const newHeightNe = Math.max(50, startCrop.height - deltaY)
                    const newYNe = startCrop.y + startCrop.height - newHeightNe
                    if (newYNe >= 0) {
                        newCrop.y = newYNe
                        newCrop.height = newHeightNe
                    }
                    break
                case 'nw':
                    const newWidthNw = Math.max(50, startCrop.width - deltaX)
                    const newXNw = startCrop.x + startCrop.width - newWidthNw
                    const newHeightNw = Math.max(50, startCrop.height - deltaY)
                    const newYNw = startCrop.y + startCrop.height - newHeightNw

                    if (newXNw >= 0) {
                        newCrop.x = newXNw
                        newCrop.width = newWidthNw
                    }
                    if (newYNw >= 0) {
                        newCrop.y = newYNw
                        newCrop.height = newHeightNw
                    }
                    break
            }

            setCrop(newCrop)
        }

        const handleResizeUp = () => {
            document.removeEventListener('mousemove', handleResizeMove)
            document.removeEventListener('mouseup', handleResizeUp)
        }

        document.addEventListener('mousemove', handleResizeMove)
        document.addEventListener('mouseup', handleResizeUp)
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth sx={{ zIndex: 1500 }}>
            <DialogTitle>Crop Image {imageType !== 'unknown' ? `(${imageType.toUpperCase()})` : ''}</DialogTitle>
            <DialogContent>
                <Box
                    ref={containerRef}
                    sx={{
                        height: 400,
                        position: 'relative',
                        backgroundColor: '#f0f0f0',
                        display: 'flex',
                        overflow: 'hidden',
                        cursor: isDragging ? 'grabbing' : 'default',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}>
                    <img
                        ref={imageRef}
                        src={imageSrc}
                        alt="Crop preview"
                        style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
                        onLoad={handleImageLoad}
                    />

                    {imageLoaded && (
                        <>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: crop.x,
                                    top: crop.y,
                                    width: crop.width,
                                    height: crop.height,
                                    border: '2px dashed #ffffff',
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                                    cursor: 'move',
                                }}>
                                {/* Resize handles */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        right: -6,
                                        bottom: -6,
                                        width: 12,
                                        height: 12,
                                        backgroundColor: 'white',
                                        border: '1px solid #333',
                                        cursor: 'se-resize',
                                    }}
                                    onMouseDown={(e) => handleResize('se', e)}
                                />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: -6,
                                        bottom: -6,
                                        width: 12,
                                        height: 12,
                                        backgroundColor: 'white',
                                        border: '1px solid #333',
                                        cursor: 'sw-resize',
                                    }}
                                    onMouseDown={(e) => handleResize('sw', e)}
                                />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        right: -6,
                                        top: -6,
                                        width: 12,
                                        height: 12,
                                        backgroundColor: 'white',
                                        border: '1px solid #333',
                                        cursor: 'ne-resize',
                                    }}
                                    onMouseDown={(e) => handleResize('ne', e)}
                                />
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: -6,
                                        top: -6,
                                        width: 12,
                                        height: 12,
                                        backgroundColor: 'white',
                                        border: '1px solid #333',
                                        cursor: 'nw-resize',
                                    }}
                                    onMouseDown={(e) => handleResize('nw', e)}
                                />
                            </Box>
                        </>
                    )}

                    {/* Hidden canvas for cropping */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleApplyCrop} disabled={isProcessing || !imageLoaded}>
                    {isProcessing ? 'Processing...' : 'Apply Crop'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
