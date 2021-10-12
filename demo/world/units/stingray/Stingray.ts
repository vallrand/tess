import { Application } from '../../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { IKRig, IKBone, SwingTwistConstraint, ArmatureNode } from '../../../engine/components'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { ParticleEmitter } from '../../../engine/particles'
import { ActionSignal, PropertyAnimation, AnimationTimeline, IAnimationTween, EventTrigger, ease } from '../../../engine/animation'
import { ParticleEffectPass } from '../../../engine/pipeline'
import { SpriteMaterial } from '../../../engine/materials'

import { TerrainSystem } from '../../terrain'
import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AIUnit, AIStrategyPlan, CloseCombatStrategy } from '../../opponent'
import { DeathEffect } from '../common'
import { LungeSkill } from './LungeSkill'
import { SnakeRig } from './SnakeRig'

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
    readonly skills = [new LungeSkill(this.context)]
    private readonly deathEffect = new DeathEffect(this.context)
    readonly gainMovementPoints: number = 2
    readonly movementDuration: number = 0.4

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel("stingray")
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[this.mesh.armature.key].activate(0, this.mesh.armature)

        const rig = new SnakeRig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public strategy(): AIStrategyPlan { return CloseCombatStrategy(this.context, this, 0, true) }
    public *damage(amount: number): Generator<ActionSignal> {

    }
    public death(): Generator<ActionSignal> {
        this.mesh.armature.ik.enabled = false
        return this.deathEffect.use(this)
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