import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4, quadraticBezier3D } from '../../engine/math'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../engine/components'
import { TransformSystem } from '../../engine/scene'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, FollowPath, ease } from '../../engine/animation'
import { ParticleEmitter } from '../../engine/particles'
import { SpriteMaterial, DecalMaterial } from '../../engine/materials'
import { ParticleEffectPass, PostEffectPass, PointLightPass, PointLight, DecalPass, Decal } from '../../engine/pipeline'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { AISystem, AIUnit, AIStrategyPlan, AIStrategy } from '../military'
import { DeathEffect } from './effects/DeathEffect'
import { FlamethrowerSkill } from './skills/FlamethrowerSkill'
import { ShieldLinkSkill } from './skills/ShieldLinkSkill'

export class Locust extends AIUnit {
    static readonly pool: Locust[] = []
    public readonly size: vec2 = vec2(2,2)
    readonly skills = [new FlamethrowerSkill(this.context), new ShieldLinkSkill(this.context)]
    readonly strategy = new AIStrategy(this.context)
    private readonly deathEffect = new DeathEffect(this.context)
    readonly maxHealthPoints: number = 40
    readonly gainMovementPoints: number = 1
    readonly gainActionPoints: number = 1
    readonly movementDuration: number = 0.8

    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel("locust")
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[this.mesh.armature.key].activate(0, this.mesh.armature)
        this.markTiles(true)
    }
    public delete(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public *damage(amount: number): Generator<ActionSignal> {

    }
    public death(): Generator<ActionSignal> {
        return this.deathEffect.use(this)
    }
    
    private motorLeft: BatchMesh
    private motorRight: BatchMesh
    public *move(path: vec2[], frames: number[]): Generator<ActionSignal> {
        this.motorLeft = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.motorLeft.material = SharedSystem.materials.stripesMaterial
        this.motorLeft.transform = this.context.get(TransformSystem)
        .create([1.3,0.7,1.2], Sprite.FlatUp, [1,-1.6,1], this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.motorLeft)
        
        this.motorRight = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
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

        for(const generator = this.moveAlongPath(path, frames, true); true;){
            const iterator = generator.next()
            animate(this.movementFloat, this.context.deltaTime)
            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.motorLeft.transform)
        this.context.get(TransformSystem).delete(this.motorRight.transform)
        this.context.get(ParticleEffectPass).remove(this.motorLeft)
        this.context.get(ParticleEffectPass).remove(this.motorRight)
        BatchMesh.delete(this.motorLeft)
        BatchMesh.delete(this.motorRight)
    }
}