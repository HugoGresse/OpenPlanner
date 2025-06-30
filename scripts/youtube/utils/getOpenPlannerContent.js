export const getOpenPlannerContent = async (openPlannerEventId) => {
    // 1. get the file list
    const response = await fetch(`https://api.openplanner.fr/v1/${openPlannerEventId}/event`)
    const data = await response.json()
    const dataUrl = data.dataUrl

    // 2. get the file content
    const dataResponse = await fetch(dataUrl)
    return await dataResponse.json()
}
