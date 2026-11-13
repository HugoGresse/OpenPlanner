const DEFAULT_CAPTCHA_URL = 'https://captcha.openplanner.fr/siteverify'

export const verifyCaptchaToken = async (token: string | undefined | null): Promise<boolean> => {
    if (!token) return false

    const secret = process.env.CAP_SECRET
    if (!secret) {
        console.warn('CAP_SECRET not set — captcha verification disabled')
        return process.env.NODE_ENV === 'test'
    }

    const url = process.env.CAP_VERIFY_URL || DEFAULT_CAPTCHA_URL

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret, response: token }),
        })
        if (!response.ok) {
            console.warn('Captcha verify request failed', response.status)
            return false
        }
        const data = (await response.json()) as { success?: boolean }
        return data.success === true
    } catch (err) {
        console.error('Captcha verify error', err)
        return false
    }
}
