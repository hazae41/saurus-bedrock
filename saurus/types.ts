export const isString = (it: any): it is string => typeof it === "string"
export const isObject = (it: any): it is object => typeof it === "object"
export const isArray = (it: any): it is Array<any> => Array.isArray(it)