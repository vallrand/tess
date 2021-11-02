export const lerp = (start: number, end: number, factor: number): number => start + (end - start) * factor
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
export const mod = (n: number, m: number): number => ((n % m) + m) % m
export const shortestAngle = (a: number, b: number): number => {
    const da = (b - a) % (2 * Math.PI)
    return 2 * da % (2 * Math.PI) - da
}
export const lerpAngle = (a: number, b: number, t: number): number => a + shortestAngle(a, b) * t

export function smoothstep(min: number, max: number, value: number): number {
    if(min === max) return value < min ? 0 : 1
    value = clamp((value - min) / (max - min), 0, 1)
    return value * value * (3 - 2 * value)
}
export function smootherstep(edge0: number, edge1: number, x: number): number {
    x = clamp((x - edge0)/(edge1 - edge0), 0.0, 1.0)
    return x * x * x * (x * (x * 6 - 15) + 10)
}

export const range = (min: number, max?: number, out: number[] = []): number[] => {
    if(max == null){
        max = min
        min = 0
    }
    for(let i = min, c = 0; i < max; i++, c++)
        out[c] = i
    return out
}

export const int32pow2 = (value: number) => !(value & (value-1)) && (!!value)
export const int32pow2Ceil = (value: number) => {
    value += +(value === 0)
    --value
    value |= value >>> 1
    value |= value >>> 2
    value |= value >>> 4
    value |= value >>> 8
    value |= value >>> 16
    return value + 1
}
export const int32pow2Floor = (value: number) => {
    value |= value >>> 1
    value |= value >>> 2
    value |= value >>> 4
    value |= value >>> 8
    value |= value >>> 16
    return value - (value>>>1)
}

export function hashString(value: string): number {
    let hash = 0
    for(let length = value.length, i = 0; i < length; i++){
        const character = value.charCodeAt(i)
        hash = ((hash << 5) - hash) + character
        hash |= 0
    }
    return hash
}

export function hashCantor(c: number, r: number): number {
    c = c >= 0 ? c*2 : -c*2 - 1
    r = r >= 0 ? r*2 : -r*2 - 1
    return (c + r) * (c + r + 1) / 2 + c
}

export function binarySearch<T>(list: T[], target: T, compare: (a: T, b: T) => number, last?: boolean): number {
    let min = 0, max = list.length
    while(min < max){
        let pivot = min + max >>> 1
        if(last ? compare(list[pivot], target) <= 0 : compare(list[pivot], target) < 0) min = pivot + 1
        else max = pivot
    }
    return last ? max : min
}

export function insertionSort<T>(list: T[], compare: (a: T, b: T) => number): void {
    for(let length = list.length, j, i = 0; i < length; i++){
        let temp = list[i]
        for(j = i - 1; j >= 0 && compare(temp, list[j]) > 0; j--)
            list[j + 1] = list[j]
        list[j+1] = temp
    }
}

export function solveQuadratic(a: number, b: number, c: number): number {
    const d = b*b - 4*a*c
    if(d < 0) return -1
    const t = -0.5 * (b + Math.sign(b) * Math.sqrt(d))
    return Math.max(t / a, c / t)
}