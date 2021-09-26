import { Application, ISystem } from '../framework'
import { clamp, ease, quat, vec3 } from '../math'
import { ParticleEmitter } from '../particles'

export interface ActionSignal {
    continue: boolean
}
export const ActionSignal = {
    WaitNextFrame: <ActionSignal> { continue: true }
}

export class AnimationSystem implements ISystem {
    private index: number = 1
    private readonly pending: Array<ActionSignal & { target: number }> = []
    private readonly queue: {
        generator: Generator<ActionSignal>
        iterator: IteratorResult<ActionSignal, ActionSignal>
        index: number
    }[] = []
    constructor(private readonly context: Application){}
    private indexOf(index: number): number {
        for(let i = 0; i < this.queue.length; i++)
            if(this.queue[i].index > index) return -1
            else if(this.queue[i].index === index) return i
        return -1
    }
    public await(index: number): ActionSignal {
        if(index == null || this.indexOf(index) == -1) return ActionSignal.WaitNextFrame
        const signal = { target: index, continue: false }
        this.pending.push(signal)
        return signal
    }
    private dispatch(index: number): void {
        let removed = 0
        for(let i = 0; i < this.pending.length; i++)
            if(this.pending[i].target === index){
                this.pending[i].continue = true
                removed++
            }else this.pending[i - removed] = this.pending[i]
        this.pending.length -= removed
    }
    public update(): void {
        let removed = 0
        for(let i = 0; i < this.queue.length; i++){
            const routine = this.queue[i]
            if(
                !routine.iterator ||
                routine.iterator.value === ActionSignal.WaitNextFrame ||
                routine.iterator.value.continue
            ) routine.iterator = routine.generator.next()

            if(routine.iterator.done) this.dispatch(routine.index)

            if(routine.iterator.done) removed++
            else this.queue[i - removed] = routine
        }
        this.queue.length -= removed
    }
    public start(generator: Generator<ActionSignal>, defer: boolean): number {
        const routine = { generator, iterator: null, index: this.index }
        if(!defer && (routine.iterator = routine.generator.next()).done) return
        this.queue.push(routine)
        return this.index++
    }
}

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
        else if(frames[i].frame > prevTime) emitter(target, frames[i].value)
}
EventTrigger.emit = (emitter: ParticleEmitter, amount: number) => emitter.count += amount

//TODO refactor to all use Event Trigger + Emitter.emit
export const EmitterTrigger = (options: {
    frame: number
    value: number
    origin?: vec3
    target?: vec3
}): IAnimationTrigger<ParticleEmitter> => function(elapsedTime: number, deltaTime: number, emitter: ParticleEmitter){
    const prevTime = elapsedTime - deltaTime
    if(!(elapsedTime >= options.frame && prevTime < options.frame)) return
    if(options.origin) vec3.copy(options.origin, emitter.uniform.uniforms['uOrigin'] as any)
    if(options.target) vec3.copy(options.target, emitter.uniform.uniforms['uTarget'] as any)
    emitter.count += options.value
    emitter.uniform.frame = 0
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

export const cubicBezier3D = (a: vec3, b: vec3, c: vec3, d: vec3, t: number, out: vec3): vec3 => {
    const t2 = t*t, t3 = t*t*t, it = 1-t, it2 = it*it, it3 = it2*it
    out[0] = it3 * a[0] + 3 * t * it2 * b[0] + 3 * t2 * it * c[0] + t3 * d[0]
    out[1] = it3 * a[1] + 3 * t * it2 * b[1] + 3 * t2 * it * c[1] + t3 * d[1]
    out[2] = it3 * a[2] + 3 * t * it2 * b[2] + 3 * t2 * it * c[2] + t3 * d[2]
    return out
}

export const quadraticBezier3D = (a: vec3, b: vec3, c: vec3, t: number, out: vec3): vec3 => {
    const t2 = t*t, it = 1-t, it2 = it*it
    out[0] = it2 * a[0] + 2*t*it * b[0] + t2 * c[0]
    out[1] = it2 * a[1] + 2*t*it * b[1] + t2 * c[1]
    out[2] = it2 * a[2] + 2*t*it * b[2] + t2 * c[2]
    return out
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