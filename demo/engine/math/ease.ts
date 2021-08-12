export type IEase = (x: number) => number
const split = (edge: number, easeA: IEase, easeB: IEase): IEase => x => x < edge ? edge * easeA(x / edge) : edge + (1 - edge) * easeB((x - edge) / (1 - edge))
const flip = (ease: IEase): IEase => x => 1 - ease(1 - x)

export const linear: IEase = x => x
export const bounceIn = (offset: number, fraction: number): IEase => {
    const v0 = 1/(fraction * fraction), v1 = 1/(1-fraction)
    return x => x >= 1 ? 1 : x<fraction ? v0*x*x : 1-offset*(1-(Math.pow(v1*(2*x-1-fraction), 2)))
}

export const elasticOut = (amplitude: number, period: number): IEase => {
    period /= Math.min(1, amplitude)
    amplitude = Math.max(1, amplitude)
    const s = period / (2 * Math.PI) * Math.asin(1 / amplitude) || 0
    const p = (2 * Math.PI) / period
    return x => amplitude * Math.pow(2, -10 * x) * Math.sin((x - s) * p) + 1
}

export const quadIn: IEase = x => x*x
export const cubicIn: IEase = x => x*x*x

export const quadOut = flip(quadIn)
export const cubicOut = flip(cubicIn)

export const quadInOut = split(0.5, quadIn, quadOut)
export const cubicInOut = split(0.5, cubicIn, cubicOut)

export const sineOut: IEase = x => Math.sin(x * 0.5 * Math.PI)
export const sineIn = flip(sineOut)
export const sineInOut = split(0.5, sineIn, sineOut)