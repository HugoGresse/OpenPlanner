export const randomColor = (mode: 'colorful' | 'random' = 'colorful') => {
    if (mode === 'colorful') {
        // Generate random values for the red, green, and blue components
        const red = Math.floor(Math.random() * 256)
        const green = Math.floor(Math.random() * 256)
        const blue = Math.floor(Math.random() * 256)

        // Convert the values to hexadecimal format
        const redHex = red.toString(16).padStart(2, '0')
        const greenHex = green.toString(16).padStart(2, '0')
        const blueHex = blue.toString(16).padStart(2, '0')

        // Concatenate the hexadecimal values to form a color in the "#RRGGBB" format
        return `#${redHex}${greenHex}${blueHex}`
    }

    return '#' + Math.floor(Math.random() * 16777215).toString(16)
}
