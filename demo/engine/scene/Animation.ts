import { Application, ISystem } from '../framework'
import { clamp, ease, vec3 } from '../math'
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
        iterator: IteratorResult<ActionSignal>
        index: number
    }[] = []
    constructor(private readonly context: Application){}
    private indexOf(index: number): number {
        for(let i = 0; i < this.queue.length; i++)
            if(this.queue[i].index > index) return -1
            else if(this.queue[i].index) return i
        return -1
    }
    public await(index: number): ActionSignal {
        if(this.indexOf(index) == -1) return ActionSignal.WaitNextFrame
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
                routine.iterator.value === ActionSignal.WaitNextFrame
            ) routine.iterator = routine.generator.next()

            if(routine.iterator.done) this.dispatch(routine.index)

            if(routine.iterator.done) removed++
            else this.queue[i - removed] = routine
        }
        this.queue.length -= removed
    }
    public start(generator: Generator<ActionSignal>): number {
        this.queue.push({ generator, iterator: null, index: this.index })
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
        if(frame == 0 && frames[0].frame > time) return lerp(out, frames[0].value, 1, out)
        else if(frame == lastIndex) return lerp(out, frames[lastIndex].value, 1, out)
        const prev = frames[frame], next = frames[frame + 1]
        const fraction = clamp((time - prev.frame) / (next.frame - prev.frame), 0, 1)
        return lerp(prev.value, next.value, (next.ease || ease.linear)(fraction), out)
    }
}

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
    target: T, tracks: Record<string, ReturnType<typeof PropertyAnimation> | ReturnType<typeof EmitterTrigger>>
){
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

export function parseEase(easing: string): ease.IEase {
    if(!easing) return
    const [ easeFunction, ...params ] = easing.split(',')
    return params.length ? ease[easeFunction](...params.map(Number)) : ease[easeFunction]
}