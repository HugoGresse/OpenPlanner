export function getQueryParams() {
    const obj: { [key: string]: string } = {}

    const searchParams = new URLSearchParams(window.location.search)
    searchParams.forEach((value, key) => {
        obj[key] = value
    })

    return obj
}
