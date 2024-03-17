export const hexDarken = (hex: string, amount: number) => {
    const newAmount = Math.round(2.55 * amount)
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - newAmount)
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - newAmount)
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - newAmount)

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
