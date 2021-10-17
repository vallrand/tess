import { Application } from '../../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4, shortestAngle } from '../../../engine/math'
import { ShaderProgram } from '../../../engine/webgl'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { Decal, DecalPass, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../../engine/pipeline'
import { DecalMaterial, SpriteMaterial, ShaderMaterial } from '../../../engine/materials'
import { ParticleEmitter } from '../../../engine/particles'
import { doubleSided } from '../../../engine/geometry'
import { shaders } from '../../../engine/shaders'
import { ActionSignal, PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger, FollowPath, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AISystem, AIUnit, AIUnitSkill } from '../../opponent'

export class ShockwaveSkill extends AIUnitSkill {
    public readonly cost: number = 1
    public readonly radius: number = 5
    public readonly cardinal: boolean = false
    public readonly damage: number = 10

    private pulse: Mesh
    private ring: Sprite
    private cylinder: BatchMesh
    private speedlines: ParticleEmitter
    private cone: BatchMesh
    private flash: Sprite
    private core: BatchMesh
    private sparkle: Sprite
    private mesh: Mesh

    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.pulse = new Mesh()
        this.pulse.order = 1
        this.pulse.buffer = SharedSystem.geometry.sphereMesh
        const pulseMaterial = new ShaderMaterial()
        pulseMaterial.cullFace = 0
        pulseMaterial.depthTest = 0
        pulseMaterial.depthWrite = false
        pulseMaterial.blendMode = ShaderMaterial.Premultiply
        pulseMaterial.program = ShaderProgram(this.context.gl, shaders.geometry_vert, require('../../shaders/pulse_frag.glsl'), {})
        this.pulse.material = pulseMaterial
        this.pulse.transform = this.context.get(TransformSystem)
        .create([0,6,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(PostEffectPass).add(this.pulse)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,4,0],Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.cylinder = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = SharedSystem.materials.energyHalfPurpleMaterial
        this.cylinder.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO,quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.speedlines = SharedSystem.particles.energy.add({
            uLifespan: [0.6,1,-0.2,0],
            uOrigin: mat4.transform([0,0,0], this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO,
            uGravity: [0,8,0],
            uSize: [0.2,0.6],
            uRadius: [3,5],
            uForce: vec2.ZERO,
            uTarget: mat4.transform([0,5,0], this.mesh.transform.matrix, vec3())
        })

        this.cone = new BatchMesh(doubleSided(SharedSystem.geometry.hemisphere))
        this.cone.material = SharedSystem.materials.absorbTealMaterial
        this.cone.transform = this.context.get(TransformSystem)
        .create([0,2.5,0],Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cone)

        this.flash = Sprite.create(BillboardType.Sphere)
        this.flash.material = new SpriteMaterial()
        this.flash.material.program = this.context.get(ParticleEffectPass).program
        this.flash.material.diffuse = SharedSystem.textures.raysRing
        this.flash.transform = this.context.get(TransformSystem)
        .create([0,5,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.flash)

        this.core = new BatchMesh(doubleSided(SharedSystem.geometry.lowpolySphere))
        this.core.material = SharedSystem.materials.energyPurpleMaterial
        this.core.transform = this.context.get(TransformSystem)
        .create([0,4,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.core)

        this.sparkle = Sprite.create(BillboardType.Sphere)
        this.sparkle.material = new SpriteMaterial()
        this.sparkle.material.program = this.context.get(ParticleEffectPass).program
        this.sparkle.material.diffuse = SharedSystem.textures.sparkle
        this.sparkle.transform = this.context.get(TransformSystem)
        .create([0,5.4,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.sparkle)

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[this.mesh.armature.key].activate,
            'mesh.color': PropertyAnimation([
                { frame: 1.0, value: vec4.ONE },
                { frame: 1.4, value: [0.8,0,0.6,1], ease: ease.cubicOut },
                { frame: 2.0, value: vec4.ONE, ease: ease.sineIn }
            ], vec4.lerp),

            'pulse.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 2.0, value: [16,16,16], ease: ease.quadOut }
            ], vec3.lerp),
            'pulse.color': PropertyAnimation([
                { frame: 1.4, value: vec4.ONE },
                { frame: 2.0, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),

            'core.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.3, value: [2.6,2.6,2.6], ease: ease.cubicOut }
            ], vec3.lerp),
            'core.color': PropertyAnimation([
                { frame: 0.8, value: [0.4,1,0.8,1] },
                { frame: 1.3, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'sparkle.transform.scale': PropertyAnimation([
                { frame: 0.7, value: vec3.ZERO },
                { frame: 0.9, value: [6,2,2], ease: ease.cubicOut }
            ], vec3.lerp),
            'sparkle.color': PropertyAnimation([
                { frame: 0.7, value: [0.6,1,1,0] },
                { frame: 0.9, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),

            'ring.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.4, value: [8,8,8], ease: ease.cubicOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.8, value: [0.5,1,1,0.4] },
                { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'cylinder.transform.scale': PropertyAnimation([
                { frame: 0.4, value: [0,8,0] },
                { frame: 1.2, value: [2.4,5,2.4], ease: ease.quadOut }
            ], vec3.lerp),
            'cylinder.color': PropertyAnimation([
                { frame: 0.4, value: [0.4,0.8,1,1] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'speedlines': EventTrigger([
                { frame: 0, value: 32 }
            ], EventTrigger.emit),
            'cone.transform.scale': PropertyAnimation([
                { frame: 0.4, value: [0,0,10] },
                { frame: 1.6, value: [3,3,4], ease: ease.cubicOut }
            ], vec3.lerp),
            'cone.color': PropertyAnimation([
                { frame: 0.4, value: [0.2,0.8,1,0] },
                { frame: 1.6, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'flash.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.4, value: [5,5,5], ease: ease.quartOut }
            ], vec3.lerp),
            'flash.color': PropertyAnimation([
                { frame: 0.8, value: [1,0.8,1,0.6] },
                { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp)
        })

        while(true)
        for(const duration = 2.4, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.sparkle.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.cone.transform)
        this.context.get(TransformSystem).delete(this.cylinder.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.pulse.transform)

        SharedSystem.particles.energy.remove(this.speedlines)
        this.context.get(ParticleEffectPass).remove(this.core)
        this.context.get(ParticleEffectPass).remove(this.sparkle)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        this.context.get(ParticleEffectPass).remove(this.cone)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(PostEffectPass).remove(this.pulse)

        Sprite.delete(this.sparkle)
        Sprite.delete(this.flash)
        Sprite.delete(this.ring)
    }
}