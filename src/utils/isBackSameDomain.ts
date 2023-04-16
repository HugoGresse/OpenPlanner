export const isBackSameDomain = () => {
    return document.referrer.indexOf(window.location.host) !== -1
}
