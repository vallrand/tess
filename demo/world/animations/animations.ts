import { clamp, vec3, quat, ease } from '../../engine/math'
import { Armature } from '../../engine/Mesh'
import { parseEase, PropertyAnimation } from '../../engine/Animation'

import animationData from './animation.json'

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

export const modelAnimations: {
    [model:string]: {
        [animation:string]: (time: number, armature: Armature) => Armature
    }
} = Object.create(null)

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
        position: position.length ? PropertyAnimation<vec3>(position, vec3.lerp, 1) : undefined,
        scale: scale.length ? PropertyAnimation<vec3>(scale, vec3.lerp, 1) : undefined,
        rotation: rotation.length ? PropertyAnimation<quat>(rotation, quat.slerp, 1) : undefined
    })).filter(Boolean))
    modelAnimations[model] = modelAnimations[model] || Object.create(null)
    modelAnimations[model][key] = animation
}