import { Event } from '../../types'
import { useEventFiles as useEventFilesContext } from '../../context/EventFilesContext'

export const useEventFiles = (event: Event) => {
    return useEventFilesContext()
}
