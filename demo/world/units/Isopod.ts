import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, ease } from '../../engine/math'
import { MeshSystem, Mesh } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { DecalPass, Decal } from '../../engine/pipeline'
import { DecalMaterial } from '../../engine/materials'
import { ParticleEmitter } from '../../engine/particles'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EmitterTrigger, BlendTween } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

export class Isopod extends ControlUnit {
    private static readonly model: string = 'isopod'
    private mesh: Mesh

    private dust: ParticleEmitter
    private shadow: Decal

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Isopod.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Isopod.model].activate(0, this.mesh.armature)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: vec3.ZERO, uLifespan: [0.6,1.2,0,0], uSize: [2,4],
            uRadius: [0,0.2], uOrientation: quat.IDENTITY,
            uForce: [2,5], uTarget: vec3.ZERO, uGravity: vec3.ZERO,
            uRotation: [0, 2 * Math.PI], uAngular: [-Math.PI,Math.PI,0,0]
        })
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        SharedSystem.particles.dust.remove(this.dust)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        this.shadow = this.context.get(DecalPass).create(4)
        this.shadow.transform = this.context.get(TransformSystem).create()
        this.shadow.transform.parent = this.mesh.transform
        this.shadow.material = new DecalMaterial()
        this.shadow.material.program = this.context.get(DecalPass).program
        this.shadow.material.diffuse = SharedSystem.textures.glow

        this.context.get(TerrainSystem).tilePosition(path[path.length - 1][0], path[path.length - 1][1], this.dust.uniform.uniforms['uOrigin'] as any)
        vec3.copy(this.dust.uniform.uniforms['uOrigin'] as any, this.dust.uniform.uniforms['uTarget'] as any)

        const animate = AnimationTimeline(this, {
            'shadow.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [6,6,6], ease: ease.quadOut }
            ], vec3.lerp),
            'shadow.color': PropertyAnimation([
                { frame: 0, value: [0.4,0.6,1,0.4] }
            ], vec4.lerp),
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,1,0], ease: ease.quartOut }
            ], BlendTween.vec3)
        })
        
        const floatDuration = 0.4
        const duration = path.length * floatDuration + 2 * floatDuration

        const dustEmit = EmitterTrigger({ frame: duration - 0.1, value: 16 })

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, true), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)
            animate(floatTime, this.context.deltaTime)

            dustEmit(elapsedTime, this.context.deltaTime, this.dust)

            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.shadow.transform)
        this.context.get(DecalPass).delete(this.shadow)
    }
    public *strike(target: vec3): Generator<ActionSignal> {
    }
}