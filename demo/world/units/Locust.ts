import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, ease } from '../../engine/math'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType } from '../../engine/components'
import { TransformSystem, AnimationSystem, ActionSignal } from '../../engine/scene'
import { PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger } from '../../engine/scene/Animation'
import { ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

export class Locust extends ControlUnit {
    private static readonly model: string = 'locust'
    public readonly size: vec2 = vec2(2,2)

    private motorLeft: BatchMesh
    private motorRight: BatchMesh

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Locust.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Locust.model].activate(0, this.mesh.armature)


    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        this.motorLeft = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.motorLeft.material = SharedSystem.materials.stripesMaterial
        this.motorLeft.transform = this.context.get(TransformSystem)
        .create([1.3,0.7,1.2], Sprite.FlatUp, [1,-1.6,1], this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.motorLeft)
        
        this.motorRight = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.motorRight.material = SharedSystem.materials.stripesMaterial
        this.motorRight.transform = this.context.get(TransformSystem)
        .create([-1.3,0.7,1.2], Sprite.FlatUp, [1,-1.6,1], this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.motorRight)

        const animate = AnimationTimeline(this, {
            'motorLeft.color': PropertyAnimation([
                { frame: 0, value: vec4.ZERO },
                { frame: 1, value: [0.5,0.3,0.8,1], ease: ease.cubicOut }
            ], vec4.lerp),
            'motorRight.color': PropertyAnimation([
                { frame: 0, value: vec4.ZERO },
                { frame: 1, value: [0.5,0.3,0.8,1], ease: ease.cubicOut }
            ], vec4.lerp)
        })

        const floatDuration = 0.8
        const duration = path.length * floatDuration + 2 * floatDuration

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, true), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime

            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)
            animate(floatTime, this.context.deltaTime)

            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.motorLeft.transform)
        this.context.get(TransformSystem).delete(this.motorRight.transform)
        this.context.get(ParticleEffectPass).remove(this.motorLeft)
        this.context.get(ParticleEffectPass).remove(this.motorRight)
    }
    public strike(target: vec2): Generator<ActionSignal> {
        return this.launch()
    }
    private *activate(): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[Locust.model].activate,
        })

        while(true)
        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
    }
    private *launch(): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[Locust.model].activateVariant,
        })

        while(true)
        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
    }
}