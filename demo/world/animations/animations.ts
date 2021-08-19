import { clamp, vec3, quat, ease } from '../../engine/math'
import { Armature } from '../../engine/Mesh'
import { ArmatureAnimation, parseEase, PropertyAnimation } from './timeline'

import animationData from './animation.json'

export const animations: {
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