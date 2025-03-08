import { FastifyReply } from 'fastify'
import { extractCookieForHeader } from '../../../other/extractCookieForHeader'
import { EventDao } from '../../../dao/eventDao'
import firebase from 'firebase-admin'
import { getBrowserHeaders, getBupherGraphQLHeaders } from './getBupherBrowserHeaders'
// Constants
export const bupherLoginDomain = 'login' + '.' + 'bu' + 'f' + 'f' + 'er' + '.com'
export const bupherDomain = 'publish' + '.' + 'bu' + 'f' + 'f' + 'er' + '.com'
export const bupherGraphQLDomain = 'graph' + '.' + 'bu' + 'f' + 'f' + 'er' + '.com'
export const BASE_URL = 'https://proxy.minix.gresse.io'

const loginBrowserHeaders = getBrowserHeaders(bupherLoginDomain)
const publishBrowserHeaders = getBrowserHeaders(bupherDomain)
const graphQLBrowserHeaders = getBupherGraphQLHeaders(bupherDomain, bupherGraphQLDomain)

// Error response helper
export const sendErrorResponse = (reply: FastifyReply, statusCode: number, errorMessage: string) => {
    return reply.code(statusCode).send({
        success: false,
        error: errorMessage,
    })
}

// Get Bupher session for an event
export const getBupherSession = async (firebaseApp: firebase.app.App, eventId: string): Promise<string> => {
    try {
        const event = await EventDao.getEvent(firebaseApp, eventId)
        if (!event.bupherSession) {
            throw new Error('No Bupher session found for this event')
        }
        return event.bupherSession
    } catch (error) {
        console.error('Error getting Bupher session:', error)
        throw error
    }
}
export const getBupherSessionAndUserId = async (
    firebaseApp: firebase.app.App,
    eventId: string
): Promise<{
    bupherSession: string
    bupherOrganizationId: string
}> => {
    const event = await EventDao.getEvent(firebaseApp, eventId)
    if (!event.bupherSession || !event.bupherOrganizationId) {
        throw new Error('No Bupher session found for this event')
    }
    return {
        bupherSession: event.bupherSession,
        bupherOrganizationId: event.bupherOrganizationId,
    }
}

// Login to Bupher and get session
export const loginToBupher = async (
    email: string,
    password: string,
    firebaseApp: firebase.app.App,
    eventId: string,
    reply: FastifyReply
): Promise<string | false> => {
    try {
        // Fetch the login page
        const loginPageResponse = await fetch(`${BASE_URL}/login`, {
            headers: {
                ...loginBrowserHeaders,
                'Sec-Fetch-Site': 'none',
            },
        })

        if (!loginPageResponse.ok) {
            console.log('Bupher first fetch:', loginPageResponse.statusText, loginPageResponse.status)
            sendErrorResponse(reply, 500, 'Failed to fetch Bupher login page')
            return false
        }

        // Get the HTML content
        const htmlContent = await loginPageResponse.text()

        // Extract CSRF token from the HTML
        const csrfMatch = htmlContent.match(/<input[^>]*name="_csrf"[^>]*value="([^"]*)"/)
        if (!csrfMatch) {
            sendErrorResponse(reply, 500, 'Could not extract CSRF token')
            return false
        }
        const csrfToken = csrfMatch[1]

        // Get cookies from the login page response and format them properly
        const rawCookies = loginPageResponse.headers.get('set-cookie')
        const cookies = rawCookies
            ?.split(',')
            .map((cookie) => cookie.split(';')[0])
            .join('; ')

        // Submit login form with CSRF token
        const loginResponse = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: {
                ...loginBrowserHeaders,
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: cookies || '',
            },
            body: new URLSearchParams({
                _csrf: csrfToken,
                email: email,
                password: password,
            }).toString(),
            redirect: 'manual',
        })

        console.log('Bupher login response:', loginResponse.statusText, loginResponse.status)

        if (loginResponse.status !== 302) {
            sendErrorResponse(reply, 401, 'Invalid credentials or login failed, status: ' + loginResponse.status)
            return false
        }

        const loginCookies = loginResponse.headers.get('set-cookie')
        const bupherSession = extractCookieForHeader(loginCookies || '')

        await EventDao.saveBupherSession(firebaseApp, eventId, bupherSession)
        return bupherSession
    } catch (error) {
        console.error('Bupher login error:', error)
        sendErrorResponse(reply, 500, 'Internal server error during Bupher login')
        return false
    }
}

// Make authenticated request to Bupher API
export const makeAuthenticatedBupherRequest = async (
    url: string,
    session: string,
    method: string = 'GET',
    body?: any
) => {
    const headers: Record<string, string> = {
        ...loginBrowserHeaders,
        Cookie: session,
    }

    if (body) {
        headers['Content-Type'] = 'application/json'
    }

    const options: RequestInit = {
        method,
        headers,
    }

    if (body) {
        options.body = JSON.stringify(body)
    }

    return fetch(`${BASE_URL}${url}`, options)
}
const clientId = 'webapp' + '-' + 'publish'
const clientIdKey = ['x-', 'bu', 'f', 'f', 'er', '-', 'client', '-', 'id'].join('')

export const makePublishRequest = async (path: string, session: string, method: string = 'GET', body?: any) => {
    const headers: Record<string, string> = {
        ...publishBrowserHeaders,
        [clientIdKey]: clientId,
        Cookie: session,
    }

    if (body) {
        headers['Content-Type'] = 'application/json'
    }

    return fetch(`${BASE_URL}${path}`, { method, headers, body })
}

export const makeBupherGraphQLRequest = async (path: string, session: string, method: string = 'GET', body?: any) => {
    const headers: Record<string, string> = {
        ...graphQLBrowserHeaders,
        Cookie: session,
        [clientIdKey]: clientId,
    }

    return fetch(`${BASE_URL}${path}`, { method, headers, body })
}
