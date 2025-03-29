import { makePublishRequest } from './bupherUtils'

export const getBupherUser = async (bupherSession: string) => {
    const loginResponse = await makePublishRequest('/rpc/user', bupherSession, 'POST', '{"args":"{}"}')
    if (!loginResponse.ok) {
        return {
            success: false,
            error: loginResponse.statusText + ' ' + loginResponse.status,
        }
    }
    const result = await loginResponse.json()
    return {
        success: true,
        result: result.result,
    }
}
