import { binarySearch } from './common'

export type IEase = (x: number) => number
export const split = (edge: number, easeA: IEase, easeB: IEase): IEase => x => x < edge ? edge * easeA(x / edge) : edge + (1 - edge) * easeB((x - edge) / (1 - edge))
export const join = (edge: number, easeA: IEase, easeB: IEase): IEase => x => x < edge ? easeA(x / edge) : easeB((x - edge) / (1 - edge))
export const flip = (ease: IEase): IEase => x => 1 - ease(1 - x)
export const reverse = (ease: IEase): IEase => x => 1 - ease(x)

export function CubicBezier(x1: number, y1: number, x2: number, y2: number, epsilon: number = 1e-5): IEase {
    const cx = 3.0 * x1, bx = 3.0 * (x2 - x1) - cx, ax = 1.0 - cx - bx
    const cy = 3.0 * y1, by = 3.0 * (y2 - y1) - cy, ay = 1.0 - cy - by

    const fX = (t: number) => ((ax * t + bx) * t + cx) * t
    const fY = (t: number) => ((ay * t + by) * t + cy) * t
    const fdX = (t: number) => (3.0 * ax * t + 2.0 * bx) * t + cx

    const fxT = (x: number) => {
        if(x < 0.0) return 0.0
        else if(x > 1.0) return 1.0
        let t = x
        newtonRaphson: for(let i = 0; i < 8; i++){
            let x0 = fX(t) - x
            if(Math.abs(x0) < epsilon) return t
            let dx = fdX(t)
            if(Math.abs(dx) < epsilon) break
            t -= x0 / dx
        }
        binary: for(let t0 = 0, t1 = 1; t0 < t1;){
            let x0 = fX(t)
            if(Math.abs(x0 - x) < epsilon) return t
            if(x > x0) t0 = t
            else t1 = t
            t = 0.5 * (t0 + t1)
        }
        return t
    }
    return x => fY(fxT(x))
}

export const stepped: IEase = x => x >= 1 ? 1 : 0
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

export const fadeInOut: IEase = x => 4*(1-x)*x
const cubicScale = 1/(Math.pow(1-1/3,2)*(1/3))
export const cubicFadeInOut: IEase = x => cubicScale*Math.pow(1-x,2)*x

export const quadIn: IEase = x => x*x
export const cubicIn: IEase = x => x*x*x
export const quartIn: IEase = x => x*x*x*x
export const quintIn: IEase = x => x*x*x*x*x

export const quadOut = flip(quadIn)
export const cubicOut = flip(cubicIn)
export const quartOut = flip(quartIn)
export const quintOut = flip(quintIn)

export const quadInOut = split(0.5, quadIn, quadOut)
export const cubicInOut = split(0.5, cubicIn, cubicOut)
export const quartInOut = split(0.5, quartIn, quartOut)
export const quintInOut = split(0.5, quintIn, quintOut)

export const sineOut: IEase = x => Math.sin(x * 0.5 * Math.PI)
export const sineIn = flip(sineOut)
export const sineInOut = split(0.5, sineIn, sineOut)

export const circIn: IEase = x => 1 - Math.sqrt(1 - x*x)
export const circOut = flip(circIn)
export const circInOut = split(0.5, circIn, circOut)

export const expoIn: IEase = x => x == 0 ? 0 : Math.pow(1024, x -  1)
export const expoOut = flip(expoIn)
export const expoInOut = split(0.5, expoIn, expoOut)

export const slowInOut = CubicBezier(0,0.5,1,0.5)

// export const quadIn = CubicBezier(0.26, 0, 0.6, 0.2)
// export const quadOut = CubicBezier(0.4, 0.8, 0.74, 1)
// export const quadInOut = CubicBezier(0.48, 0.04, 0.52, 0.96)
// export const cubicIn = CubicBezier(0.32, 0, 0.66, -0.02)
// export const cubicOut = CubicBezier(0.34, 1.02, 0.68, 1)
// export const cubicInOut = CubicBezier(0.62, -0.04, 0.38, 1.04)
// export const quartIn = CubicBezier(0.46, 0, 0.74, -0.04)
// export const quartOut = CubicBezier(0.26, 1.04, 0.54, 1)
// export const quartInOut = CubicBezier(0.7, -0.1, 0.3, 1.1)
// export const quintIn = CubicBezier(0.52, 0, 0.78, -0.1)
// export const quintOut = CubicBezier(0.22, 1.1, 0.48, 1)
// export const quintInOut = CubicBezier(0.76, -0.14, 0.24, 1.14)
// export const sineIn = CubicBezier(0.32, 0, 0.6, 0.36) 
// export const sineOut = CubicBezier(0.4, 0.64, 0.68, 1)
// export const sineInOut = CubicBezier(0.36, 0, 0.64, 1)
// export const expoIn = CubicBezier(0.62, 0.02, 0.84, -0.08)
// export const expoOut = CubicBezier(0.16, 1.08, 0.38, 0.98)
// export const expoInOut = CubicBezier(0.84, -0.12, 0.16, 1.12)
// export const circIn = CubicBezier(0.54, 0, 1, 0.44)
// export const circOut = CubicBezier(0, 0.56, 0.46, 1)
// export const circInOut = CubicBezier(0.88, 0.14, 0.12, 0.86)

export function Spline(values: number[], positions: number[], type: number, tension: number = 0.5): IEase {
    const sort = (a: number, b: number) => a - b
    const lastIndex = values.length - 1
    positions = positions || values.map((_, i) => i / lastIndex)
    let c1 = Infinity, c2 = -Infinity, reciprocal = 0
    let v1 = 0, v2 = 0, m0 = 0, m1 = 0
    return function(time: number): number {
        if(time <= positions[0]) return values[0]
        else if(time >= positions[lastIndex]) return values[lastIndex]
        if(time < c1 || time >= c2){
            const index = binarySearch(positions, time, sort) - 1
            c1 = positions[index]
            c2 = positions[index + 1]
            reciprocal = c1 === c2 ? 0 : 1.0 / (c2 - c1)
            v1 = values[index]
            v2 = values[index + 1]

            const c0 = index === 0 ? 2*positions[0]-positions[1] : positions[index - 1]
            const c3 = index === lastIndex - 1 ? 2*positions[index + 1]-positions[index] : positions[index + 2]
            const v0 = index === 0 ? 2*values[0]-values[1] : values[index - 1]
            const v3 = index === lastIndex - 1 ? 2*values[index + 1]-values[index] : values[index + 2]
    
            const s0 = c2 === c0 ? 0 : 2 * (c2 - c1) / (c2 - c0)
            const s1 = c3 === c1 ? 0 : 2 * (c2 - c1) / (c3 - c1)
            m0 = tension * s0 * (v2 - v0)
            m1 = tension * s1 * (v3 - v1)
        }
        const t = reciprocal * (time - c1)
        if(type === 0)
            return v1
        else if(type === 1){
            return v1 + t * (v2 - v1)
        }else if(type === 2){
            return v1 + (t * t * (3 - 2 * t)) * (v2 - v1)
        }else{
            const t2 = t * t, tt = t + t, it = 1 - t, it2 = it * it
            return v1 * ((1 + tt) * it2) +
                    m0 * (t * it2) +
                    v2 * (t2 * (3 - tt)) +
                    m1 * (t2 * (t - 1))
        }
    }
}