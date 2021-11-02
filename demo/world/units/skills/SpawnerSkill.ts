import { Application } from '../../../engine/framework'
import { lerp, vec2, vec3, vec4, quat, mat4 } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { ParticleEffectPass, PointLightPass, PointLight } from '../../../engine/pipeline'
import { SpriteMaterial } from '../../../engine/materials'
import { ParticleEmitter } from '../../../engine/particles'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, ease } from '../../../engine/animation'

import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AISystem, AIUnit, AIUnitSkill } from '../../military'

interface SpawnerEffect {
    key: string
    index: number
    parent: SpawnerSkill
    tile: vec2

    scarab?: AIUnit
    light?: PointLight
    glow?: BatchMesh
    beam?: Sprite
    smoke?: ParticleEmitter
    ring?: Sprite
}

export class SpawnerSkill extends AIUnitSkill {
    public readonly cost: number = 1
    public readonly radius: number = 0
    public readonly cardinal: boolean = true

    private mesh: Mesh
    private readonly spawners: SpawnerEffect[] = [{
        key: 'spawner6', index: 6, parent: this, tile: vec2(3,1)
    }, {
        key: 'spawner7', index: 7, parent: this, tile: vec2(1,-1)
    }, {
        key: 'spawner8', index: 8, parent: this, tile: vec2(1,3)
    }, {
        key: 'spawner9', index: 9, parent: this, tile: vec2(-1,1)
    }]
    public use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        return AnimationSystem.zip(this.spawners.map(turret => this.activateSpawner(turret, source)))
    }
    private *activateSpawner(effect: SpawnerEffect, source: AIUnit): Generator<ActionSignal> {
        const offset = this.mesh.armature.nodes[effect.index].position
        const rotation = this.mesh.armature.nodes[effect.index].rotation
        const parentTransform = this.context.get(TransformSystem)
        .create(offset, rotation, vec3.ONE, this.mesh.transform)
        parentTransform.recalculate(this.context.frame)

        effect.glow = BatchMesh.create(SharedSystem.geometry.openBox)
        effect.glow.material = SharedSystem.materials.gradientMaterial
        effect.glow.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.axisAngle(vec3.AXIS_Y, 0.5*Math.PI, quat()), vec3.ONE, parentTransform)
        this.context.get(ParticleEffectPass).add(effect.glow)

    
        effect.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        effect.beam.material = new SpriteMaterial()
        effect.beam.material.program = this.context.get(ParticleEffectPass).program
        effect.beam.material.diffuse = SharedSystem.textures.raysBeam
        effect.beam.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.axisAngle(vec3.AXIS_Y, 0.5*Math.PI, quat()), vec3.ONE, parentTransform)
        this.context.get(ParticleEffectPass).add(effect.beam)

        effect.smoke = SharedSystem.particles.smoke.add({
            uLifespan: [0.8,1.2,-0.4,0],
            uOrigin: mat4.transform([0,0.5,-1],parentTransform.matrix,vec3()),
            uGravity:[0,8,0],
            uRotation:[0,2*Math.PI], uSize:[1,4],
            uFieldDomain: vec4.ONE, uFieldStrength: [4,0]
        })

        effect.ring = Sprite.create(BillboardType.None)
        effect.ring.material = new SpriteMaterial()
        effect.ring.material.program = this.context.get(ParticleEffectPass).program
        effect.ring.material.diffuse = SharedSystem.textures.swirl
        effect.ring.transform = this.context.get(TransformSystem)
        .create([0,1,0], Sprite.FlatUp, vec3.ONE, parentTransform)
        this.context.get(ParticleEffectPass).add(effect.ring)

        effect.light = this.context.get(PointLightPass).create([1,0.6,0.7])
        effect.light.transform = parentTransform

        effect.scarab = this.context.get(AISystem).create(source.tile[0] + effect.tile[0], source.tile[1] + effect.tile[1], 0)

        const animate = AnimationTimeline(effect, {
            'scarab.mesh.color': PropertyAnimation([
                { frame: 0.4, value: [16,0,0,0.2] },
                { frame: 1.6, value: vec4.ONE, ease: ease.quadIn }
            ], vec4.lerp),
            'scarab.mesh.transform.rotation': PropertyAnimation([
                { frame: 0, value: quat.axisAngle(vec3.AXIS_Y, Math.atan2(offset[0], offset[2]), quat()) }
            ], quat.slerp),
            'scarab.mesh.transform.position': PropertyAnimation([
                { frame: 0.4, value: mat4.transform([0,-0.5,-1], parentTransform.matrix, vec3()) },
                { frame: 1.6, value: vec3.copy(effect.scarab.mesh.transform.position, vec3()), ease: ease.quartOut }
            ], vec3.lerp),

            'light.radius': PropertyAnimation([
                { frame: 0.2, value: 0 },
                { frame: 1.2, value: 4, ease: ease.quadOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0.2, value: 6 },
                { frame: 1.2, value: 0, ease: ease.sineIn }
            ], lerp),

            'parent.mesh.armature': modelAnimations[effect.parent.mesh.armature.key][effect.key],
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
        })

        for(const duration = 1.6, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(effect.light.transform)
        this.context.get(TransformSystem).delete(effect.ring.transform)
        this.context.get(TransformSystem).delete(effect.glow.transform)
        this.context.get(TransformSystem).delete(effect.beam.transform)

        this.context.get(ParticleEffectPass).remove(effect.ring)
        this.context.get(ParticleEffectPass).remove(effect.glow)
        this.context.get(ParticleEffectPass).remove(effect.beam)

        SharedSystem.particles.smoke.remove(effect.smoke)
        this.context.get(PointLightPass).delete(effect.light)

        Sprite.delete(effect.ring)
        Sprite.delete(effect.beam)
        BatchMesh.delete(effect.glow)
    }
}