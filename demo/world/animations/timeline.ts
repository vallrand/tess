import { clamp, vec3, vec4, quat, ease } from '../../engine/math'
import { Armature } from '../../engine/Mesh'
import { Sprite } from '../../engine/batch'

export function PropertyAnimation<T>(frames: {
    frame: number
    value: T
    ease?: (value: number) => number
}[], lerp?: (prev: T, next: T, fraction: number, out: T) => T, framerate: number = 1){
    if(frames.length == 1) return (time: number, out: T): T => lerp(frames[0].value, frames[0].value, 0, out)
    const duration = frames.reduce((max, { frame }) => Math.max(max, frame), 0)
    const lookup = new Uint8Array(duration + 1)
    for(let length = lookup.length, i = frames.length - 2; i >= 0; length = frames[i--].frame)
        for(let j = frames[i].frame; j < length; j++) lookup[j] = i
    
    return (time: number, out: T): T => {
        time = clamp(framerate * time, 0, duration)
        const frame = lookup[time | 0]
        const prev = frames[frame]
        const next = frames[frame + 1]
        const fraction = Math.max(0, (time - prev.frame) / (next.frame - prev.frame))
        return lerp(prev.value, next.value, (next.ease || ease.linear)(fraction), out)
    }
}

export const SpriteAnimation = (track: {
    rotation?: (time: number, out: quat) => quat
    position?: (time: number, out: vec3) => vec3
    scale?: (time: number, out: vec3) => vec3
    color?: (time: number, out: vec4) => vec4
}) => function(time: number, sprite: Sprite){
    track.position?.(time, sprite.transform.position)
    track.rotation?.(time, sprite.transform.rotation)
    track.scale?.(time, sprite.transform.scale)
    track.color?.(time, sprite.color)
    sprite.transform.frame = 0
    // sprite.frame = 0
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
    const [ easeFunction, ...params ] = easing.split('|')
    return params.length ? ease[easeFunction](...params.map(Number)) : ease[easeFunction]
}