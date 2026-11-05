import { expect, test } from 'vitest'
import { withSocialIcons } from './socials'

test('withSocialIcons keeps a given icon and derives the others from the name', () => {
    expect(
        withSocialIcons([
            { name: 'Linked In', link: 'https://l.in/a' },
            { name: 'X', icon: 'twitter', link: 'https://x.com/a' },
        ])
    ).toEqual([
        { name: 'Linked In', icon: 'linked-in', link: 'https://l.in/a' },
        { name: 'X', icon: 'twitter', link: 'https://x.com/a' },
    ])
})
