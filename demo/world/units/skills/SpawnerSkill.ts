import { Application } from '../../../engine/framework'
import { lerp, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { ParticleEffectPass, PointLightPass, PointLight } from '../../../engine/pipeline'
import { ParticleEmitter } from '../../../engine/particles'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'

import { SharedSystem, ModelAnimation } from '../../shared'
import { AISystem, AIUnit, AIUnitSkill } from '../../military'
import { TerrainSystem } from '../../terrain'

const actionTimeline = {
    'scarab.mesh.color': PropertyAnimation([
        { frame: 0.4, value: [16,0,0,0.2] },
        { frame: 1.6, value: vec4.ONE, ease: ease.quadIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0.2, value: 0 },
        { frame: 1.2, value: 4, ease: ease.quadOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0.2, value: 6 },
        { frame: 1.2, value: 0, ease: ease.sineIn }
    ], lerp),
    'glow.transform.scale': PropertyAnimation([
        { frame: 0.2, value: [1,0,1] },
        { frame: 1.1, value: [1,4,1], ease: ease.cubicOut }
    ], vec3.lerp),
    'glow.color': PropertyAnimation([
        { frame: 0.2, value: [1,0.4,0.6,0] },
        { frame: 1.1, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0.4, value: [4,0,4] },
        { frame: 0.8, value: [2,4,2], ease: ease.quartOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.4, value: [0.8,0.7,1,0] },
        { frame: 0.8, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'smoke': EventTrigger([
        { frame: 0, value: 24 }
    ], EventTrigger.emit),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.4, value: vec3.ZERO },
        { frame: 1.0, value: [6,6,6], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0.4, value: [1.0,0.7,0.8,0.4] },
        { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp)
}

class Spawner {
    private scarab: AIUnit
    private light: PointLight
    private glow: BatchMesh
    private beam: Sprite
    private smoke: ParticleEmitter
    private ring: Sprite
    private mesh: Mesh

    constructor(
        private readonly context: Application,
        private readonly skill: SpawnerSkill,
        readonly key: string,
        readonly index: number,
        readonly tile: vec2
    ){}
    public *activate(source: AIUnit): Generator<ActionSignal> {
        this.mesh = source.mesh

        if(this.context.get(TerrainSystem).getTile(source.tile[0] + this.tile[0], source.tile[1] + this.tile[1]) != null) return
        this.scarab = this.context.get(AISystem).create(source.tile[0] + this.tile[0], source.tile[1] + this.tile[1], 0)

        const offset = this.mesh.armature.nodes[this.index].position
        const rotation = this.mesh.armature.nodes[this.index].rotation
        const parentTransform = this.context.get(TransformSystem)
        .create(offset, rotation, vec3.ONE, this.mesh.transform)
        parentTransform.recalculate(this.context.frame)

        this.glow = BatchMesh.create(SharedSystem.geometry.openBox)
        this.glow.material = SharedSystem.materials.gradientMaterial
        this.glow.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.HALF_Y, vec3.ONE, parentTransform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.beam.material = SharedSystem.materials.sprite.beam
        this.beam.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.HALF_Y, vec3.ONE, parentTransform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.smoke = SharedSystem.particles.smoke.add({
            uLifespan: [0.8,1.2,-0.4,0],
            uOrigin: mat4.transform([0,0.5,-1],parentTransform.matrix,vec3()),
            uGravity:[0,8,0],
            uRotation:[0,2*Math.PI], uSize:[1,4],
            uFieldDomain: vec4.ONE, uFieldStrength: [4,0]
        })

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,1,0], Sprite.FlatUp, vec3.ONE, parentTransform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.light = this.context.get(PointLightPass).create([1,0.6,0.7])
        this.light.transform = parentTransform

        const animate = AnimationTimeline(this, {
            'mesh.armature': ModelAnimation(this.key),
            'scarab.mesh.transform.rotation': PropertyAnimation([
                { frame: 0, value: quat.axisAngle(vec3.AXIS_Y, Math.atan2(offset[0], offset[2]), quat()) }
            ], quat.slerp),
            'scarab.mesh.transform.position': PropertyAnimation([
                { frame: 0.4, value: mat4.transform([0,-0.5,-1], parentTransform.matrix, vec3()) },
                { frame: 1.6, value: vec3.copy(this.scarab.mesh.transform.position, vec3()), ease: ease.quartOut }
            ], vec3.lerp),
            ...actionTimeline
        })

        for(const duration = 1.6, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.glow)
        this.context.get(ParticleEffectPass).remove(this.beam)
        SharedSystem.particles.smoke.remove(this.smoke)
        this.context.get(PointLightPass).delete(this.light)
        Sprite.delete(this.ring)
        Sprite.delete(this.beam)
        BatchMesh.delete(this.glow)
    }
}

export class SpawnerSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly range: number = 0
    readonly cardinal: boolean = true
    readonly pierce: boolean = false
    readonly damage: number = 0

    private readonly spawners: Spawner[] = [
        new Spawner(this.context, this, 'spawner6', 6, vec2(3,1)),
        new Spawner(this.context, this, 'spawner7', 7, vec2(1,-1)),
        new Spawner(this.context, this, 'spawner8', 8, vec2(1,3)),
        new Spawner(this.context, this, 'spawner9', 9, vec2(-1,1)),
    ]
    public validate(origin: vec2, target: vec2): boolean {
        const terrain = this.context.get(TerrainSystem)
        let open: number = 0
        for(let i = 0; i < this.spawners.length; i++)
        if(terrain.getTile(origin[0] + this.spawners[i].tile[0], origin[1] + this.spawners[i].tile[1]) == null) open++
        return open >= 4
    }
    public use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        return AnimationSystem.zip(this.spawners.map(spawner => spawner.activate(source)))
    }
}