import { mat4, quat, vec2, vec3, vec4, mod, lerp } from '../../engine/math'
import { Application } from '../../engine/framework'
import { GL, ShaderProgram } from '../../engine/webgl'
import { createCylinder, applyTransform, doubleSided, modifyGeometry } from '../../engine/geometry'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { TransformSystem, Transform } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, MeshSystem, Mesh, BatchMesh } from '../../engine/components'
import { DecalMaterial, SpriteMaterial, MeshMaterial } from '../../engine/materials'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'

import { CubeModuleModel, modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { Cube, Direction, DirectionAngle } from '../player'
import { CubeSkill } from './CubeSkill'
import { TerrainSystem } from '../terrain'

const actionTimeline = {
    'particles': EventTrigger([{ frame: 0.2, value: 48 }], EventTrigger.emit),
    'cone.transform.scale': PropertyAnimation([
        { frame: 0, value: [0.2,0.2,1] },
        { frame: 0.6, value: vec3.ONE, ease: ease.sineOut },
        { frame: 0.8, value: [0,0,2], ease: ease.quartIn }
    ], vec3.lerp),
    'cone.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.6, value: vec4.ONE, ease: ease.quadOut },
        { frame: 0.8, value: [1,0,1,0], ease: ease.cubicIn }
    ], vec4.lerp),
    'glow.transform.position': PropertyAnimation([
        { frame: 0, value: [0,0,-3] }
    ], vec3.lerp),
    'glow.transform.scale': PropertyAnimation([
        { frame: 0.5, value: vec3.ZERO },
        { frame: 0.8, value: [8,8,8], ease: ease.quartOut }
    ], vec3.lerp),
    'glow.color': PropertyAnimation([
        { frame: 0.5, value: [0.7,1,0.9,0] },
        { frame: 0.8, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.7, value: [6,6,6], ease: ease.quadIn },
        { frame: 1.6, value: [12,12,12], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.transform.position': PropertyAnimation([
        { frame: 0, value: [0,0,-1] },
        { frame: 1.6, value: [0,0,-3], ease: ease.quartOut }
    ], vec3.lerp),
    'ring.transform.rotation': PropertyAnimation([
        { frame: 0, value: [0,0,0,1] },
        { frame: 0.8, value: [0,0,-1,0], ease: ease.quadIn },
        { frame: 1.6, value: [0,0,0,-1], ease: ease.quadOut }
    ], quat.slerp),
    'ring.color': PropertyAnimation([
        { frame: 0.8, value: [0.6,1,0.9,0] },
        { frame: 1.6, value: vec4.ZERO, ease: ease.sineOut }
    ], vec4.lerp),
    'sphere.transform.position': PropertyAnimation([
        { frame: 0, value: [0,0,-2] },
        { frame: 0.7, value: [0,0,-2.8], ease: ease.quadInOut }
    ], vec3.lerp),
    'sphere.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.7, value: [2,2,2], ease: ease.quadIn },
        { frame: 1.0, value: [0,3,0], ease: ease.cubicIn }
    ], vec3.lerp),
    'distortion.transform.scale': PropertyAnimation([
        { frame: 0.7, value: [16,16,16] },
        { frame: 0.9, value: vec3.ZERO, ease: ease.cubicIn }
    ], vec3.lerp),
    'distortion.color': PropertyAnimation([
        { frame: 0.7, value: vec4.ZERO },
        { frame: 0.9, value: [1,1,0.5,0.5], ease: ease.sineOut }
    ], vec4.lerp)
}

class CorrosiveOrb {
    orb: Mesh
    aura: Sprite
    decal: Decal
    transform: Transform
    fire: ParticleEmitter
    readonly tile: vec2 = vec2()
    constructor(private readonly context: Application, private readonly parent: OrbSkill){}
    public get enabled(): boolean { return !!this.orb }
    public place(column: number, row: number): void {
        vec2.set(column, row, this.tile)
        this.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(column, row, this.transform.position)
        this.transform.position[1] += 1

        this.decal = this.context.get(DecalPass).create(8)
        this.decal.material = SharedSystem.materials.corrosionMaterial
        this.decal.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ZERO, this.transform)

        this.orb = new Mesh()
        this.orb.buffer = SharedSystem.geometry.sphereMesh
        this.orb.order = 4
        this.orb.layer = 8
        this.context.get(MeshSystem).list.push(this.orb)
        this.orb.material = SharedSystem.materials.orbMaterial
        this.orb.transform = this.context.get(TransformSystem).create()
        this.orb.transform.parent = this.transform

        this.aura = Sprite.create(BillboardType.Sphere, 4)
        this.aura.material = SharedSystem.materials.auraTealMaterial
        this.aura.transform = this.context.get(TransformSystem).create()
        this.aura.transform.parent = this.transform
        this.context.get(ParticleEffectPass).add(this.aura)

        this.fire = SharedSystem.particles.fire.add({
            uLifespan: vec4(0.8,1.0,0,0),
            uOrigin: this.transform.position,
            uRotation: vec2.ZERO,
            uGravity: vec3.ZERO,
            uSize: vec2(1,3),
            uRadius: vec2(0.8,1.2)
        })
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.transform)
        this.context.get(TransformSystem).delete(this.aura.transform)
        this.context.get(TransformSystem).delete(this.orb.transform)
        this.context.get(TransformSystem).delete(this.decal.transform)
        this.context.get(DecalPass).delete(this.decal)
        this.orb = this.aura = null
        SharedSystem.particles.fire.remove(this.fire)
    }
    public *appear(origin: vec3): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'decal.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [8,8,8], ease: ease.quadOut }
            ], vec3.lerp),
            'aura.transform.parent.position': PropertyAnimation([
                { frame: 0, value: origin },
                { frame: 1, value: vec3.copy(this.aura.transform.parent.position, vec3()), ease: ease.sineInOut }
            ], vec3.lerp),
            'aura.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [4,4,4], ease: ease.elasticOut(1,0.5) }
            ], vec3.lerp),
            'orb.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [1,1,1], ease: ease.elasticOut(1,0.8) }
            ], vec3.lerp)
        })

        this.fire.rate = 0.36
        for(const duration = 1.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
    }
    public *dissolve(): Generator<ActionSignal> {
        this.fire.rate = 0
        const animate = AnimationTimeline(this, {
            'decal.color': PropertyAnimation([
                { frame: 0, value: vec4.ONE },
                { frame: 1, value: [1,1,1,0], ease: ease.sineOut }
            ], vec4.lerp),
            'aura.color': PropertyAnimation([
                { frame: 0, value: vec4.ONE },
                { frame: 1, value: vec4.ZERO, ease: ease.sineOut }
            ], vec4.lerp),
            'orb.color': PropertyAnimation([
                { frame: 0, value: vec4.ONE },
                { frame: 1, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp)
        })

        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        this.kill()
        const index = this.parent.list.indexOf(this)
        this.parent.list.splice(index, 1)
        this.parent.pool.push(this)
    }
}

export class OrbSkill extends CubeSkill {
    pool: CorrosiveOrb[] = []
    list: CorrosiveOrb[] = []
    private cone: BatchMesh
    private glow: Sprite
    private ring: Sprite
    private sphere: BatchMesh
    private distortion: Sprite
    private particles: ParticleEmitter

    constructor(context: Application, cube: Cube){
        super(context, cube)
        const cone = createCylinder({
            radiusTop: 0.5, radiusBottom: 4, height: 4,
            horizontal: 8, radial: 8,
            cap: false, angleStart: 0, angleLength: 2 * Math.PI
        })
        const rotation = quat()
        modifyGeometry(cone, function verticalSkew(position: vec3, normal: vec3){
            const skewAngle = 1.6 * Math.PI * ease.circIn(0.5 + position[1] / 4)
            quat.axisAngle(vec3.AXIS_Y, skewAngle, rotation)
            quat.transform(position, rotation, position)
            quat.transform(normal, rotation, normal)
        })
        applyTransform(cone, mat4.fromRotationTranslationScale(
            Sprite.FlatUp, vec3(0,0,-2), vec3.ONE, mat4()))
        this.cone = new BatchMesh(doubleSided(cone))
        this.cone.material = SharedSystem.materials.coneTealMaterial
        
        this.glow = Sprite.create(BillboardType.Sphere, -8)
        this.glow.material = new SpriteMaterial()
        this.glow.material.cullFace = GL.NONE
        this.glow.material.program = this.context.get(ParticleEffectPass).program
        this.glow.material.diffuse = SharedSystem.textures.sparkle

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = new SpriteMaterial()
        this.ring.material.cullFace = GL.NONE
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl

        this.sphere = new BatchMesh(SharedSystem.geometry.lowpolySphere)
        this.sphere.material = SharedSystem.materials.coneTealMaterial

        this.distortion = Sprite.create(BillboardType.None)
        this.distortion.material = new SpriteMaterial()
        this.distortion.material.cullFace = GL.NONE
        this.distortion.material.blendMode = null
        this.distortion.material.program = SharedSystem.materials.chromaticAberration
        this.distortion.material.diffuse = SharedSystem.textures.wave
    }
    public *activate(transform: mat4, orientation: quat): Generator<ActionSignal> {
        const mesh = this.cube.meshes[this.cube.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.sides[this.cube.side].type]]

        const origin = mat4.transform([0,1,0], this.cube.transform.matrix, vec3())
        const parentTransform = this.context.get(TransformSystem).create()
        vec3.copy(origin, parentTransform.position)
        quat.copy(DirectionAngle[mod(this.direction + 3, 4)], parentTransform.rotation)
        const target = quat.transform([0,1,-3], parentTransform.rotation, vec3())
        mat4.transform(target, this.cube.transform.matrix, target)

        this.cone.transform = this.context.get(TransformSystem).create()
        this.cone.transform.parent = parentTransform
        this.context.get(ParticleEffectPass).add(this.cone)

        this.sphere.transform = this.context.get(TransformSystem).create()
        this.sphere.transform.parent = parentTransform
        quat.axisAngle(vec3.AXIS_X, 0.5*Math.PI, this.sphere.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.sphere)

        this.glow.transform = this.context.get(TransformSystem).create()
        this.glow.transform.parent = parentTransform
        this.context.get(ParticleEffectPass).add(this.glow)

        this.ring.transform = this.context.get(TransformSystem).create()
        this.ring.transform.parent = parentTransform
        this.context.get(ParticleEffectPass).add(this.ring)

        this.distortion.transform = this.context.get(TransformSystem).create()
        this.distortion.transform.parent = parentTransform
        vec3.set(0,0,-2, this.distortion.transform.position)
        this.context.get(PostEffectPass).add(this.distortion)

        const particleTarget = quat.transform([0,-0.2,0.5], parentTransform.rotation, vec3())
        vec3.add(origin, particleTarget, particleTarget)

        this.particles = SharedSystem.particles.sparks.add({
            uLifespan: [0.5,0.8,-0.5,0],
            uOrigin: origin,
            uLength: [0.2,0.5],
            uGravity: quat.transform([0,0,10], parentTransform.rotation, vec3()),
            uSize: [0.2,0.8],
            uRadius: [0,0.5],
            uForce: [6,10],
            uTarget: particleTarget
        })

        const animate = AnimationTimeline(this, actionTimeline)

        const orb = this.pool.pop() || new CorrosiveOrb(this.context, this)
        const tile: vec2 = [vec2(0,-2),vec2(-2,0),vec2(0,2),vec2(2,0)][this.direction]
        vec2.add(this.cube.tile, tile, tile)

        //TODO remove
        if(this.list.length > 0) this.context.get(AnimationSystem).start(this.list[0].dissolve(), true)

        for(const duration = 1.6, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.activate(elapsedTime, mesh.armature)

            if(elapsedTime > 0.8 && !orb.enabled){
                this.list.push(orb)
                orb.place(tile[0], tile[1])
                this.context.get(AnimationSystem).start(orb.appear(target), true)
            }

            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(parentTransform)
        this.context.get(TransformSystem).delete(this.cone.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.sphere.transform)
        this.context.get(TransformSystem).delete(this.distortion.transform)

        this.context.get(ParticleEffectPass).remove(this.cone)
        this.context.get(ParticleEffectPass).remove(this.glow)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.sphere)
        this.context.get(PostEffectPass).remove(this.distortion)

        SharedSystem.particles.bolts.remove(this.particles)
    }
}