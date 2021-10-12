import { clamp, quat, vec3 } from '../math'
import { ParticleEmitter } from '../particles'
import * as ease from './ease'

export type IAnimationTrigger<T = any> = (elapsed: number, deltaTime: number, target: T) => void
export type IAnimationTween<T = any> = (elapsed: number, target: T) => T

export function PropertyAnimation<T>(frames: {
    frame: number
    value: T
    ease?: ease.IEase
}[], lerp: (prev: T, next: T, fraction: number, out: T) => T, framerate: number = 1): IAnimationTween<T> {
    frames.sort((a, b) => a.frame - b.frame)
    const lastIndex = frames.length - 1
    let frame = 0
    return (time: number, out: T): T => {
        time *= framerate
        while(true)
            if(frame > 0 && frames[frame].frame > time) frame--
            else if(frame < lastIndex && frames[frame+1].frame < time) frame++
            else break
        const prev = frames[frame]
        if(frame === 0 && prev.frame > time) return lerp(out, prev.value, 1, out)
        else if(frame === lastIndex) return lerp(out, prev.value, 1, out)
        const next = frames[frame + 1]
        const fraction = clamp((time - prev.frame) / (next.frame - prev.frame), 0, 1)
        return lerp(prev.value, next.value, (next.ease || ease.linear)(fraction), out)
    }
}

export const EventTrigger = <T, U>(frames: {
    frame: number
    value: U
}[], emitter: (target: T, options: U) => void): IAnimationTrigger<T> =>
function(elapsedTime: number, deltaTime: number, target: T){
    const prevTime = elapsedTime - deltaTime
    for(let length = frames.length, i = 0; i < length; i++)
        if(frames[i].frame > elapsedTime) break
        else if(frames[i].frame > prevTime) emitter.call(this, target, frames[i].value)
}
EventTrigger.emit = (emitter: ParticleEmitter, amount: number) => emitter.count += amount
EventTrigger.emitReset = function(emitter: ParticleEmitter, options: {
    amount: number
    [key: string]: number[] | number
}){
    for(let key in options)
        if(key in emitter.uniform.uniforms)
            emitter.uniform.uniforms[key].set(options[key] as number[], 0)
    emitter.count += options.amount
}

export function AnimationTimeline<T>(
    root: T, tracks: Record<string, ReturnType<typeof PropertyAnimation> | IAnimationTrigger>
){
    const properties = Object.keys(tracks).map(key => {
        const path = key.split('.').reverse()
        let node = root
        for(let i = path.length - 1; i > 0; i--) node = node[path[i]]
        return { sampler: tracks[key] as any, property: path[0], target: node as any }
    })
    return function(elapsedTime: number, deltaTime: number){
        for(let i = properties.length - 1; i >= 0; i--){
            const { sampler, property, target } = properties[i]
            if(sampler.length === 3) sampler.call(root, elapsedTime, deltaTime, target[property])
            else target[property] = sampler.call(root, elapsedTime, target[property])
            if(!isNaN(target.frame)) target.frame = 0
        }
    }
}

export function parseEase(easing: string): ease.IEase {
    if(!easing) return
    const [ easeFunction, ...params ] = easing.split(',')
    return params.length ? ease[easeFunction](...params.map(Number)) : ease[easeFunction]
}

export const BlendTween = {
    temp: quat(),
    vec3: function(prev: vec3, next: vec3, t: number, out: vec3): vec3 {
        out[0] += prev[0] + t * (next[0] - prev[0])
        out[1] += prev[1] + t * (next[1] - prev[1])
        out[2] += prev[2] + t * (next[2] - prev[2])
        return out
    },
    quat: function(prev: quat, next: quat, t: number, out: quat): quat {
        quat.slerp(prev, next, t, BlendTween.temp)
        quat.multiply(out, BlendTween.temp, out)
        return out
    }
}