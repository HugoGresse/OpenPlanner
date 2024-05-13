interface FlattenedObject {
    [key: string]: any
}

export const flattenObject = (obj: any, prefix: string = ''): FlattenedObject => {
    let result: FlattenedObject = {}

    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key]
            const newKey = prefix ? `${prefix}.${key}` : key

            if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        const arrayKey = `${newKey}[${index}]`
                        if (typeof item === 'object' && item !== null) {
                            result = { ...result, ...flattenObject(item, arrayKey) }
                        } else {
                            result[arrayKey] = item
                        }
                    })
                } else {
                    result = { ...result, ...flattenObject(value, newKey) }
                }
            } else {
                result[newKey] = value
            }
        }
    }

    return result
}
