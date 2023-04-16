import { isBackSameDomain } from './isBackSameDomain'

export const navigateBackOrFallbackTo = (fallbackUrl: string, setLocation: (url: string) => void) => {
    if (isBackSameDomain()) {
        window.history.back()
    } else {
        setLocation(fallbackUrl)
    }
}
