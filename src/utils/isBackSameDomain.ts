export const isBackSameDomain = () => {
    if (document.referrer !== '') {
        console.log('document.referrer: ', document.referrer)
        return document.referrer.indexOf(window.location.host) > -1
    }
    return true
}
