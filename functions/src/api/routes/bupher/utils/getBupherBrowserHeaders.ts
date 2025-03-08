// Get browser headers for requests
export const getBrowserHeaders = (domain: string) => {
    return {
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Origin: 'https://' + domain,
        Host: domain,
        'X-Target-Domain': domain,
        Referer: 'https://' + domain + '/login',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
    }
}
export const getBupherGraphQLHeaders = (referer: string, alt: string) => {
    return {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:137.0) Gecko/20100101 Firefox/137.0',
        Accept: '*/*',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        Referer: `https://${referer}`,
        'content-type': 'application/json',
        Origin: `https://${referer}`,
        'X-Target-Domain': alt,
        DNT: '1',
        'Sec-GPC': '1',
        'Alt-Used': alt,
        Connection: 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        Priority: 'u=0',
        TE: 'trailers',
    }
}
