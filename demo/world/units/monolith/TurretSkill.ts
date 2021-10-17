import { Application } from '../../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4, shortestAngle } from '../../../engine/math'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { ParticleEffectPass, PointLightPass, PointLight } from '../../../engine/pipeline'
import { SpriteMaterial } from '../../../engine/materials'
import { ParticleEmitter } from '../../../engine/particles'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, FollowPath, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AIUnit, AIUnitSkill } from '../../opponent'

interface TurretEffect {
    key: string
    index: number
    parent: AIUnit
    context: Application
    damage: number

    trailLeft?: Line
    trailRight?: Line
    dust?: Sprite
    flashLeft?: Sprite
    flashRight?: Sprite
    light?: PointLight
    ring?: Sprite
    wave?: BatchMesh
    sparks?: ParticleEmitter
}

export class TurretSkill extends AIUnitSkill {
    public readonly cost: number = 1
    public readonly radius: number = 4
    public readonly cardinal: boolean = false
    public readonly damage: number = 2

    private mesh: Mesh
    private readonly turrets: TurretEffect[] = [{
        key: 'turret11', index: 10, parent: null, context: this.context, damage: this.damage
    }, {
        key: 'turret01', index: 12, parent: null, context: this.context, damage: this.damage
    }, {
        key: 'turret00', index: 14, parent: null, context: this.context, damage: this.damage
    }, {
        key: 'turret10', index: 16, parent: null, context: this.context, damage: this.damage
    }]

    public validate(origin: vec2, target: vec2): boolean {
        const dx = target[0] - origin[0] - 1
        const dy = target[1] - origin[1] - 1
        return dx*dx + dy*dy <= this.radius * this.radius
    }

    public use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        this.turrets.forEach(effect => effect.parent = source)
        return AnimationSystem.zip(this.turrets.map(turret => this.activateTurret(turret, target)))
    }

    private *activateTurret(effect: TurretEffect, target: vec2): Generator<ActionSignal> {
        const originPosition = mat4.transform(vec3.ZERO, this.mesh.armature.nodes[effect.index].globalTransform, vec3())
        const referenceAngle = Math.atan2(originPosition[0], originPosition[2])
        vec3.add(this.mesh.transform.position, originPosition, originPosition)
        const targetPosition = this.context.get(TerrainSystem).tilePosition(target[0], target[1], vec3())
        const direction = vec3.subtract(targetPosition, originPosition, vec3())

        const angleXZ = Math.atan2(direction[0], direction[2])
        if(Math.abs(shortestAngle(angleXZ, referenceAngle)) > 0.25*Math.PI) return
        const originRotation = quat.axisAngle(vec3.AXIS_Y, referenceAngle, quat())
        const targetRotation = quat.fromNormal(vec3.normalize(direction, vec3()), vec3.AXIS_Y, quat())
        
        effect.dust = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        effect.dust.material = new SpriteMaterial()
        effect.dust.material.program = this.context.get(ParticleEffectPass).program
        effect.dust.material.diffuse = SharedSystem.textures.groundDust
        effect.dust.transform = this.context.get(TransformSystem).create(targetPosition)
        this.context.get(ParticleEffectPass).add(effect.dust)

        const trailMaterial = new SpriteMaterial()
        trailMaterial.program = this.context.get(ParticleEffectPass).program
        trailMaterial.diffuse = SharedSystem.gradients.tealLine

        effect.trailLeft = new Line(2)
        effect.trailLeft.width = 0.3
        effect.trailLeft.ease = ease.reverse(ease.quadIn)
        effect.trailLeft.addColorFade(effect.trailLeft.ease)
        effect.trailLeft.material = trailMaterial
        this.context.get(ParticleEffectPass).add(effect.trailLeft)

        effect.trailRight = new Line(2)
        effect.trailRight.width = 0.3
        effect.trailRight.ease = ease.reverse(ease.quadIn)
        effect.trailRight.addColorFade(effect.trailRight.ease)
        effect.trailRight.material = trailMaterial
        this.context.get(ParticleEffectPass).add(effect.trailRight)

        const transformMatrix = mat4.fromRotationTranslationScale(targetRotation,originPosition,vec3.ONE,mat4())
        
        const originLeft = mat4.transform([0.25,0,1], transformMatrix, vec3())
        const originRight = mat4.transform([-0.25,0,1], transformMatrix, vec3())

        const targetLeft = vec3.add(originLeft, direction, vec3())
        const targetRight = vec3.add(originRight, direction, vec3())

        const flashMaterial = new SpriteMaterial()
        flashMaterial.program = this.context.get(ParticleEffectPass).program
        flashMaterial.diffuse = SharedSystem.textures.rays


        effect.flashLeft = Sprite.create(BillboardType.Sphere)
        effect.flashLeft.material = flashMaterial
        effect.flashRight = Sprite.create(BillboardType.Sphere)
        effect.flashRight.material = effect.flashLeft.material
        effect.flashLeft.transform = this.context.get(TransformSystem)
        .create(mat4.transform([0.25,0,1.5], transformMatrix, vec3()))
        effect.flashRight.transform = this.context.get(TransformSystem)
        .create(mat4.transform([-0.25,0,1.5], transformMatrix, vec3()))
        this.context.get(ParticleEffectPass).add(effect.flashLeft)
        this.context.get(ParticleEffectPass).add(effect.flashRight)

        effect.sparks = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.8,0,0],
            uOrigin: targetPosition, uTarget: vec3.add([0,-0.2,0], targetPosition, vec3()),
            uLength: [0.1,0.2], uSize: [0.2,0.4],
            uForce: [4,12], uRadius: [0.2,0.2], uGravity: [0,-24,0],
        })

        effect.ring = Sprite.create(BillboardType.None)
        effect.ring.material = new SpriteMaterial()
        effect.ring.material.program = this.context.get(ParticleEffectPass).program
        effect.ring.material.diffuse = SharedSystem.textures.ring
        effect.ring.transform = this.context.get(TransformSystem)
        .create(vec3.add(targetPosition, [0,0.2,0], vec3()), Sprite.FlatUp)
        this.context.get(ParticleEffectPass).add(effect.ring)

        effect.wave = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        effect.wave.material = SharedSystem.materials.ringDustMaterial
        effect.wave.transform = this.context.get(TransformSystem)
        .create(targetPosition, quat.IDENTITY)
        this.context.get(ParticleEffectPass).add(effect.wave)

        effect.light = this.context.get(PointLightPass).create([0.4,1,0.9])
        effect.light.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,1,0], targetPosition, vec3()))

        const animate = AnimationTimeline(effect, {
            'parent.mesh.armature': modelAnimations[effect.parent.mesh.armature.key][effect.key],
            [`parent.mesh.armature.nodes.${effect.index}.rotation`]: PropertyAnimation([
                { frame: 0.0, value: originRotation },
                { frame: 0.4, value: targetRotation, ease: ease.cubicOut },
                { frame: 0.8, value: targetRotation, ease: ease.linear },
                { frame: 1.4, value: originRotation, ease: ease.quadInOut }
            ], quat.slerp),

            'dust.transform.scale': PropertyAnimation([
                { frame: 0.7, value: vec3.ZERO },
                { frame: 1.2, value: [1.6,4,1.6], ease: ease.quartOut }
            ], vec3.lerp),
            'dust.color': PropertyAnimation([
                { frame: 0.7, value: [0,0.1,0.1,1] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'trailLeft': FollowPath.Line(PropertyAnimation([
                { frame: 0.4, value: originLeft },
                { frame: 0.6, value: targetLeft, ease: ease.linear }
            ], vec3.lerp), { length: 0.24 }),
            'trailRight': FollowPath.Line(PropertyAnimation([
                { frame: 0.4, value: originRight },
                { frame: 0.6, value: targetRight, ease: ease.linear }
            ], vec3.lerp), { length: 0.24 }),
            'flashLeft.transform.scale': PropertyAnimation([
                { frame: 0.3, value: vec3.ZERO },
                { frame: 0.5, value: [3,3,3], ease: ease.cubicOut }
            ], vec3.lerp),
            'flashLeft.color': PropertyAnimation([
                { frame: 0.3, value: [0.6,1,1,0] },
                { frame: 0.5, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'flashRight.transform.scale': PropertyAnimation([
                { frame: 0.3, value: vec3.ZERO },
                { frame: 0.5, value: [3,3,3], ease: ease.cubicOut }
            ], vec3.lerp),
            'flashRight.color': PropertyAnimation([
                { frame: 0.3, value: [0.6,1,1,0] },
                { frame: 0.5, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'sparks': EventTrigger([
                { frame: 0.5, value: 24 }
            ], EventTrigger.emit),
            'ring.transform.scale': PropertyAnimation([
                { frame: 0.6, value: vec3.ZERO },
                { frame: 1.0, value: [4,4,4], ease: ease.cubicOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.6, value: [0.4,1,0.9,0.4] },
                { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'light.radius': PropertyAnimation([
                { frame: 0.6, value: 0 },
                { frame: 1.0, value: 4, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0.6, value: 4 },
                { frame: 1.0, value: 0, ease: ease.sineIn }
            ], lerp),
            'wave.transform.scale': PropertyAnimation([
                { frame: 0.7, value: [0,2,0] },
                { frame: 1.2, value: [4,1,4], ease: ease.quartOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 0.7, value: [0.2,1,0.8,1] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.sineOut }
            ], vec4.lerp),

            'damage': EventTrigger([{ frame: 0.6, value: target }], AIUnitSkill.damage)
        })

        for(const duration = 1.4, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.sparks.remove(effect.sparks)
        this.context.get(TransformSystem).delete(effect.wave.transform)
        this.context.get(TransformSystem).delete(effect.dust.transform)
        this.context.get(TransformSystem).delete(effect.flashLeft.transform)
        this.context.get(TransformSystem).delete(effect.flashRight.transform)
        this.context.get(TransformSystem).delete(effect.light.transform)
        this.context.get(TransformSystem).delete(effect.ring.transform)

        this.context.get(PointLightPass).delete(effect.light)
        this.context.get(ParticleEffectPass).remove(effect.wave)
        this.context.get(ParticleEffectPass).remove(effect.dust)
        this.context.get(ParticleEffectPass).remove(effect.flashLeft)
        this.context.get(ParticleEffectPass).remove(effect.flashRight)
        this.context.get(ParticleEffectPass).remove(effect.ring)

        Sprite.delete(effect.dust)
        Sprite.delete(effect.flashLeft)
        Sprite.delete(effect.flashRight)
        Sprite.delete(effect.ring)
    }
}