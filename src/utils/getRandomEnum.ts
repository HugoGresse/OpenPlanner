// from https://stackoverflow.com/a/74200816/1377145
export function randomEnum<T>(anEnum: T): T[keyof T] {
    // @ts-ignore
    const enumValues = Object.keys(anEnum) as T[keyof T][]
    const randomIndex = Math.floor((Math.random() * enumValues.length) / 2)
    return enumValues[randomIndex]
}
