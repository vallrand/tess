import { clamp, vec3, quat, ease } from '../engine/math'
import { Armature } from '../engine/Mesh'

import animationData from './animation.json'

function PropertyAnimation<T>(frames: {
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

const ArmatureAnimation = (tracks: {
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

export const animations: {
    [model:string]: {
        [animation:string]: (time: number, armature: Armature) => Armature
    }
} = Object.create(null)

function parseEase(easing: string): ease.IEase {
    if(!easing) return
    const [ easeFunction, ...params ] = easing.split('|')
    return params.length ? ease[easeFunction](...params.map(Number)) : ease[easeFunction]
}

for(let model in animationData)
for(let key in animationData[model]){
    const frames: {
        frame: number
        index: number
        position?: vec3
        rotation?: quat
        scale?: vec3
        ease: keyof typeof ease
    }[] = animationData[model][key]
    const duration = frames.reduce((max, frame) => Math.max(max, frame.frame), 0)
    const timelines = []
    for(let i = 0; i < frames.length; i++){
        const { frame, index, position, rotation, scale } = frames[i]
        const easing = parseEase(frames[i].ease)
        if(!timelines[index]) timelines[index] = { index, position: [], rotation: [], scale: [] }
        if(position) timelines[index].position.push({ frame, value: position, ease: easing })
        if(scale) timelines[index].scale.push({ frame, value: scale, ease: easing })
        if(rotation) timelines[index].rotation.push({ frame, value: rotation, ease: easing })
    }
    const animation = ArmatureAnimation(timelines.map(({ index, position, scale, rotation }) => ({
        index,
        position: position.length ? PropertyAnimation<vec3>(position, vec3.lerp, duration) : undefined,
        scale: scale.length ? PropertyAnimation<vec3>(scale, vec3.lerp, duration) : undefined,
        rotation: rotation.length ? PropertyAnimation<quat>(rotation, quat.slerp, duration) : undefined
    })).filter(Boolean))
    animations[model] = animations[model] || Object.create(null)
    animations[model][key] = animation
}