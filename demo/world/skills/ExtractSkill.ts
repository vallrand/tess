import { random, lerp, ease, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { GL, ShaderProgram } from '../../engine/webgl'
import { AnimationTimeline, PropertyAnimation, EmitterTrigger, EventTrigger, AnimationSystem, ActionSignal } from '../../engine/scene/Animation'
import { TransformSystem } from '../../engine/scene'
import { ParticleEmitter, GradientRamp } from '../../engine/particles'
import { Sprite, BillboardType, Mesh, BatchMesh } from '../../engine/components'
import { DecalMaterial, EffectMaterial, ShaderMaterial, SpriteMaterial, MaterialSystem } from '../../engine/materials'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'
import { shaders } from '../../engine/shaders'

import { CubeModuleModel, modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { Cube, DirectionTile } from '../player'
import { CubeSkill } from './CubeSkill'
import { TerrainSystem } from '../terrain'

const actionTimeline = {
    'cube.light.intensity': PropertyAnimation([
        { frame: 0.8, value: 1 },
        { frame: 1.2, value: 3, ease: ease.quadIn },
        { frame: 1.6, value: 1, ease: ease.sineOut }
    ], lerp),
    'glow.transform.scale': PropertyAnimation([
        { frame: 1.0, value: [1,0,1] },
        { frame: 1.8, value: [1,4,1], ease: ease.quadOut }
    ], vec3.lerp),
    'glow.color': PropertyAnimation([
        { frame: 1.0, value: [0.89, 0.93, 0.64,0] },
        { frame: 1.8, value: vec4.ZERO, ease: ease.sineOut }
    ], vec4.lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0.8, value: vec3.ZERO },
        { frame: 1.0, value: [2,2,2], ease: ease.quadIn },
        { frame: 1.6, value: [4,4,4], ease: ease.cubicOut }
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 1.0, value: [0.12,0.10,0.16,0.8] },
        { frame: 1.6, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'beam.transform.scale': PropertyAnimation([
        { frame: 0.2, value: [1,0,1] },
        { frame: 0.8, value: [1,4,1], ease: ease.quadOut }
    ], vec3.lerp),
    'beam.color': PropertyAnimation([
        { frame: 0.8, value: [0.89, 0.93, 0.64,0] },
        { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'tube.transform.scale': PropertyAnimation([
        { frame: 0, value: [4,-10,4] },
        { frame: 0.8, value: [2,-8,2], ease: ease.sineOut }
    ], vec3.lerp),
    'tube.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO },
        { frame: 0.8, value: [0.4,1.0,0.8,1], ease: ease.cubicOut },
        { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'cracks.transform.scale': PropertyAnimation([
        { frame: 0, value: [16,4,16] }
    ], vec3.lerp),
    'cracks.threshold': PropertyAnimation([
        { frame: 1.0, value: -3 },
        { frame: 1.4, value: 0, ease: ease.quadOut },
        { frame: 1.8, value: 3, ease: ease.cubicIn }
    ], lerp),
    'cracks.color': PropertyAnimation([
        { frame: 1.2, value: [0.92, 0.94, 0.74,0] },
        { frame: 1.8, value: vec3.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'cracks.transform.rotation': EventTrigger(0, (rotation: quat) =>
    quat.axisAngle(vec3.AXIS_Y, 2*Math.PI*random(), rotation)),
    'smoke.rate': PropertyAnimation([
        { frame: 0, value: 0.05 },
        { frame: 0.5, value: 0.01, ease: ease.quadIn },
        { frame: 1.0, value: 0, ease: ease.stepped }
    ], lerp)
}

export class ExtractSkill extends CubeSkill {
    smoke: ParticleEmitter
    cracks: Decal
    cracksMaterial: DecalMaterial
    tube: BatchMesh
    beam: Sprite
    ring: Sprite
    glow: BatchMesh
    constructor(context: Application, cube: Cube){
        super(context, cube)

        this.glow = new BatchMesh(SharedSystem.geometry.cross)
        this.glow.material = SharedSystem.materials.gradientMaterial

        this.cracksMaterial = new DecalMaterial()
        this.cracksMaterial.program = this.context.get(DecalPass).program
        this.cracksMaterial.diffuse = SharedSystem.textures.cracks
        this.cracksMaterial.normal = SharedSystem.textures.cracksNormal

        this.tube = new BatchMesh(SharedSystem.geometry.cylinder)
        //TODO material from minefield
        const tubeMaterial = new EffectMaterial(this.context.gl, {
            PANNING: true, GREYSCALE: true, GRADIENT: true, VERTICAL_MASK: true
        }, {
            uUVTransform: vec4(0,0,3,2),
            uUVPanning: vec2(-0.4,-0.8),
            uColorAdjustment: vec3(1,1,0),
            uUV2Transform: vec4(0,0.04,2,2),
            uUV2Panning: vec2(0.4,-0.8),
            uVerticalMask: vec4(0.0,0.5,0.8,1.0),
        })
        tubeMaterial.gradient = GradientRamp(this.context.gl, [
            0xffffffff, 0xebdadad0, 0xd18a9790, 0x94063ca0, 0x512e3c70, 0x29202330, 0x00000000, 0x00000000
        ], 1)
        tubeMaterial.diffuse = SharedSystem.textures.boxStripes
        this.tube.material = tubeMaterial


        this.beam = new Sprite()
        this.beam.billboard = BillboardType.Cylinder
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam
        vec2.set(0,0.5,this.beam.origin)


        this.ring = new Sprite()
        this.ring.billboard = BillboardType.None
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.ring
    }
    public *open(): Generator<ActionSignal> {
        const origin = mat4.transform(vec3.ZERO, this.cube.transform.matrix, vec3())
        const trigger = EmitterTrigger({ frame: 0.6, value: 36, origin: origin, target: origin })
        for(const generator = super.open(), startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            trigger(elapsedTime, this.context.deltaTime, this.cube.dust)
            const iterator = generator.next()
            if(iterator.done) return iterator.value
            else yield iterator.value
        }
    }
    public *close(): Generator<ActionSignal> {
        for(const generator = super.close(); true;){
            const iterator = generator.next()
            if(iterator.done) return iterator.value
            else yield iterator.value
        }
    }
    protected clear(): void {
        this.smoke = void SharedSystem.particles.smoke.remove(this.smoke)
    }
    public *activate(): Generator<ActionSignal> {
        const resource = this.context.get(TerrainSystem).resources.get(this.cube.state.tile[0], this.cube.state.tile[1])
        if(!resource) return

        const mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.state.sides[this.cube.state.side].type]]

        const origin = mat4.transform(vec3.ZERO, this.cube.transform.matrix, vec3())

        this.cracks = this.context.get(DecalPass).create(0)
        this.cracks.material = this.cracksMaterial
        this.cracks.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.cracks.transform.position)

        this.tube.transform = this.context.get(TransformSystem).create()
        vec3.add([0,4,0], origin, this.tube.transform.position)
        this.context.get(ParticleEffectPass).add(this.tube)

        this.beam.transform = this.context.get(TransformSystem).create()
        vec3.add([0,4,0], origin, this.beam.transform.position)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.glow.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.glow.transform.position)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.ring.transform = this.context.get(TransformSystem).create()
        vec3.add([0,4,0], origin, this.ring.transform.position)
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, this.ring.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.smoke = this.smoke || SharedSystem.particles.smoke.add({
            uLifespan: [1.0,2.0,0,0],
            uOrigin: vec3.add([0,4,0], origin, vec3()),
            uRotation: [0,2*Math.PI],
            uGravity: [0,5.6,0],
            uSize: [1,4],
            uFieldDomain: [0.4,0.4,0.4,0],
            uFieldStrength: [4,0]
        })

        const animate = AnimationTimeline(this, actionTimeline)

        resource.amount--
        const drain = PropertyAnimation([
            { frame: 0, value: resource.decal.threshold },
            { frame: 2, value: lerp(1, 0, resource.amount / resource.capacity), ease: ease.linear }
        ], lerp)

        excavation: for(const duration = 2.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.loop(elapsedTime, mesh.armature)
            resource.decal.threshold = drain(elapsedTime, resource.decal.threshold)

            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        if(resource.amount <= 0) resource.kill()

        this.context.get(TransformSystem).delete(this.cracks.transform)
        this.context.get(TransformSystem).delete(this.tube.transform)
        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)

        this.context.get(ParticleEffectPass).remove(this.tube)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.glow)
        this.context.get(ParticleEffectPass).remove(this.ring)

        this.context.get(DecalPass).delete(this.cracks)
    }
    protected validate(): boolean {
        const tile = vec2()
        const terrain = this.context.get(TerrainSystem)
        for(let i = DirectionTile.length - 1; i >= 0; i--){
            vec2.add(this.cube.state.tile, DirectionTile[i], tile)
            if(terrain.getTile(tile[0], tile[1]) != null) return false
        }
        return true
    }
}