import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, ease } from '../../engine/math'
import { MeshSystem, Mesh, BatchMesh } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { Decal, DecalPass, ParticleEffectPass, PointLightPass, PointLight } from '../../engine/pipeline'
import { DecalMaterial, SpriteMaterial } from '../../engine/materials'
import { GradientRamp, ParticleEmitter } from '../../engine/particles'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EmitterTrigger, BlendTween } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

export class Monolith extends ControlUnit {
    private static readonly model: string = 'monolith'
    public readonly size: vec2 = vec2(3,3)
    private mesh: Mesh

    private glow: BatchMesh
    private light: PointLight

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Monolith.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Monolith.model].activate(0, this.mesh.armature)
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        this.glow = new BatchMesh(SharedSystem.geometry.openBox)
        this.glow.material = SharedSystem.materials.gradientMaterial
        this.glow.transform = this.context.get(TransformSystem).create()
        this.glow.transform.parent = this.mesh.transform
        this.context.get(ParticleEffectPass).add(this.glow)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create()
        this.light.transform.parent = this.mesh.transform
        vec3.set(0,2,0, this.light.transform.position)

        const animate = AnimationTimeline(this, {
            'glow.transform.scale': PropertyAnimation([
                { frame: 0, value: [6,0,6] },
                { frame: 1, value: [6,3,6], ease: ease.quadOut }
            ], vec3.lerp),
            'glow.color': PropertyAnimation([
                { frame: 0, value: [1,0,0.5,1] },
                { frame: 0.5, value: [0.5,0.7,1,0.2], ease: ease.sineIn }
            ], vec4.lerp),
            'light.color': PropertyAnimation([
                { frame: 0, value: [1,0,0.5] },
                { frame: 0.5, value: [0.5,0.7,1], ease: ease.sineIn }
            ], vec3.lerp),
            'light.radius': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 1, value: 6, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 1, value: 8, ease: ease.sineOut }
            ], lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.2,0], ease: ease.sineInOut }
            ], BlendTween.vec3)
        })

        const floatDuration = 1
        const duration = path.length * floatDuration + 2 * floatDuration

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, false), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)

            animate(floatTime, this.context.deltaTime)

            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.glow)
    }
    public *strike(target: vec2): Generator<ActionSignal> {
    }
}