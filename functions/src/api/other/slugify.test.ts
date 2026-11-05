import { expect, test } from 'vitest'
import { slugify } from './slugify'

test('slugify matches the web admin ids', () => {
    expect(slugify('  Hugo Gresse ')).toBe('hugo-gresse')
    expect(slugify('Élodie   D’Ambrosio')).toBe('elodie-dambrosio')
    expect(slugify('???')).toBe('')
})
