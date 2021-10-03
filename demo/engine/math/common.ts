export const random = (seed => function mulberry32(): number {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
})(0X1F6)

export const lerp = (start: number, end: number, factor: number): number => start + (end - start) * factor
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
export const mod = (n: number, m: number): number => ((n % m) + m) % m
export const randomFloat = (min: number, max: number, random: () => number): number => random() * (max - min) + min
export const randomInt = (min: number, max: number, random: () => number): number => Math.floor(random() * (max - min + 1)) + min
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

export const range = (min: number, max?: number, out: number[] = []): number[] => {
    if(max == null){
        max = min
        min = 0
    }
    for(let i = min, c = 0; i < max; i++, c++)
        out[c] = i
    return out
}

export const shuffle = <T>(out: T[], random: () => number): T[] => {
    for(let i = out.length - 1; i > 0; i--){
        let j = (random() * (i + 1)) | 0
        let temp: T = out[i]
        out[i] = out[j]
        out[j] = temp
    }
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