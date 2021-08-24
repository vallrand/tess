import { Application } from '../../engine/framework'
import { clamp, vec3, vec4, quat, ease } from '../../engine/math'
import { Armature } from '../../engine/Mesh'
import { Sprite } from '../../engine/batch'
import { ParticleEmitter } from '../../engine/particles'
import { PointLight } from '../../engine/deferred/PointLightPass'

export const EmitterTrigger = (options: {
    frame: number
    value: number
    origin?: vec3
    target?: vec3
}) => function(elapsedTime: number, deltaTime: number, emitter: ParticleEmitter){
    const prevTime = elapsedTime - deltaTime
    if(!(elapsedTime >= options.frame && prevTime < options.frame)) return
    if(options.origin) vec3.copy(options.origin, emitter.uniform.uniforms['uOrigin'] as any)
    if(options.target) vec3.copy(options.target, emitter.uniform.uniforms['uTarget'] as any)
    emitter.count += options.value
    emitter.uniform.frame = 0
}

export function PropertyAnimation<T>(frames: {
    frame: number
    value: T
    ease?: ease.IEase
}[], lerp?: (prev: T, next: T, fraction: number, out: T) => T, framerate: number = 1){
    frames.sort((a, b) => a.frame - b.frame)
    const lastIndex = frames.length - 1
    let frame = 0
    return (time: number, out: T): T => {
        time *= framerate
        while(true)
            if(frame > 0 && frames[frame].frame > time) frame--
            else if(frame < lastIndex && frames[frame+1].frame < time) frame++
            else break
        if(frame == 0 && frames[0].frame > time) return lerp(out, frames[0].value, 1, out)
        else if(frame == lastIndex) return lerp(out, frames[lastIndex].value, 1, out)
        const prev = frames[frame], next = frames[frame + 1]
        const fraction = clamp((time - prev.frame) / (next.frame - prev.frame), 0, 1)
        return lerp(prev.value, next.value, (next.ease || ease.linear)(fraction), out)
    }
}

export function AnimationTimeline<T>(target: T, tracks: Record<string, ReturnType<typeof PropertyAnimation>>){
    const properties = Object.keys(tracks).map(key => {
        const path = key.split('.').reverse()
        let node = target
        for(let i = path.length - 1; i > 0; i--) node = node[path[i]]
        return { sampler: tracks[key] as any, property: path[0], target: node as any }
    })
    return function(elapsedTime: number, deltaTime: number){
        for(let i = properties.length - 1; i >= 0; i--){
            const { sampler, property, target } = properties[i]
            if(sampler.length === 3) sampler(elapsedTime, deltaTime, target[property])
            else target[property] = sampler(elapsedTime, target[property])
            if(!isNaN(target.frame)) target.frame = 0
        }
    }
}

export const ArmatureAnimation = (tracks: {
    index: number
    rotation?: (time: number, out: quat) => quat
    position?: (time: number, out: vec3) => vec3
    scale?: (time: number, out: vec3) => vec3
}[]) => function(time: number, armature: Armature){
    for(let i = tracks.length - 1; i >= 0; i--){
        const track = tracks[i], node = armature.nodes[track.index]
        track.position?.(time, node.position)
        track.rotation?.(time, node.rotation)
        track.scale?.(time, node.scale)
    }
    armature.frame = 0
    return armature
}

export function parseEase(easing: string): ease.IEase {
    if(!easing) return
    const [ easeFunction, ...params ] = easing.split(',')
    return params.length ? ease[easeFunction](...params.map(Number)) : ease[easeFunction]
}