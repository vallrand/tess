import { vec2, vec3, quat } from '../../engine/math'
import { MeshSystem } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { ActionSignal, AnimationTimeline, IAnimationTween } from '../../engine/animation'

import { ModelAnimation } from '../shared'
import { AIUnit, AIStrategy } from '../military'
import { LungeSkill } from './skills/LungeSkill'
import { SnakeRig } from './effects/SnakeRig'

function WavyTween(options: {
    amplitude: vec3
    frequency: vec3
}, blend: (prev: vec3, next: vec3, out: vec3) => vec3): IAnimationTween<vec3> {
    const { amplitude, frequency } = options
    const offset = vec3()
    return function(elapsed: number, target: vec3): vec3 {
        offset[0] = amplitude[0] * Math.cos(this.context.currentTime * frequency[0]) * elapsed
        offset[1] = amplitude[1] * Math.cos(this.context.currentTime * frequency[1]) * elapsed
        offset[2] = amplitude[2] * Math.cos(this.context.currentTime * frequency[2]) * elapsed
        return blend(offset, target, target)
    }
}

function LookAtTween(tween: IAnimationTween<vec3>): IAnimationTween<quat> {
    const normal = vec3(), rotation = quat()
    return function(elapsed: number, target: quat): quat {
        tween.call(this, elapsed, normal)
        normal[2] += 2
        vec3.normalize(normal, normal)
        quat.unitRotation(vec3.AXIS_Z, normal, rotation)
        return quat.multiply(target, rotation, target)
    }
}

export class Stingray extends AIUnit {
    static readonly pool: Stingray[] = []
    readonly skills = [new LungeSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    readonly health = { capacity: 4, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 1 }
    readonly movement = { capacity: 2, amount: 0, gain: 2 }
    readonly group: number = 2
    readonly movementDuration: number = 0.4

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel('stingray')
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        ModelAnimation('activate')(0, this.mesh.armature)
        this.markTiles(true)

        const rig = new SnakeRig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.mesh = void this.context.get(MeshSystem).delete(this.mesh)
        Stingray.pool.push(this)
    }
    public damage(amount: number, type: number): void {
        super.damage(amount, type)
        if(this.health.amount <= 0) this.mesh.armature.ik.enabled = false
    }
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'mesh.transform.position': WavyTween({
                amplitude: [0,0.1,0],
                frequency: [0,7.1,0]
            }, vec3.add),
            'mesh.transform.rotation': LookAtTween(WavyTween({
                amplitude: [0.2,0.2,0],
                frequency: [6.3,7.1,0]
            }, vec3.copy))
        })
        
        for(const generator = this.moveAlongPath(path, frames, true); true;){
            const iterator = generator.next()
            animate(this.movementFloat, this.context.deltaTime)
            if(iterator.done) break
            else yield iterator.value
        }
    }
}