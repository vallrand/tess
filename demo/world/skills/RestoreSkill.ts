import { lerp, mat4, quat, vec2, vec3, vec4 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { TransformSystem } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, Mesh, BatchMesh } from '../../engine/components'
import { DecalMaterial, SpriteMaterial } from '../../engine/materials'
import { Decal, DecalPass, ParticleEffectPass, PostEffectPass, PointLightPass, PointLight } from '../../engine/pipeline'

import { CubeModuleModel, modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { Cube, DirectionTile } from '../player'
import { CubeSkill } from './CubeSkill'
import { TerrainSystem } from '../terrain'

const activateTimeline = {
    'tubeX.transform.scale': PropertyAnimation([
        { frame: 0.3, value: [0,6,0] },
        { frame: 1, value: [1.4,6,1.4], ease: ease.cubicOut }
    ], vec3.lerp),
    'tubeZ.transform.scale': PropertyAnimation([
        { frame: 0.3, value: [0,6,0] },
        { frame: 1, value: [1.4,6,1.4], ease: ease.cubicOut }
    ], vec3.lerp),
    'tubeX.color': PropertyAnimation([
        { frame: 0.3, value: [1,0,0,1] },
        { frame: 0.6, value: vec4.ONE, ease: ease.sineIn }
    ], vec4.lerp),
    'tubeZ.color': PropertyAnimation([
        { frame: 0.3, value: [1,0,0,1] },
        { frame: 0.6, value: vec4.ONE, ease: ease.sineIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0.5, value: 0 },
        { frame: 0.8, value: 8, ease: ease.quartOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0.5, value: 8 },
        { frame: 0.8, value: 1, ease: ease.sineIn }
    ], lerp),
    'bolts.rate': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.5, value: 0.02, ease: ease.stepped }
    ], lerp),
    'ring.transform.scale': PropertyAnimation([
        { frame: 0, value: [12,4,12], ease: ease.quadOut },
        { frame: 0.3, value: vec3.ZERO, ease: ease.quadIn },
    ], vec3.lerp),
    'ring.color': PropertyAnimation([
        { frame: 0, value: vec4.ZERO, ease: ease.quadIn },
        { frame: 0.3, value: [0.7,0.7,1,0.6], ease: ease.quadOut },
    ], vec4.lerp),
    'sparks': EventTrigger([{ frame: 0.4, value: 64 }], EventTrigger.emit),
    'flash.transform.scale': PropertyAnimation([
        { frame: 0.5, value: vec3.ZERO },
        { frame: 0.9, value: [10,10,10], ease: ease.quartOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 0.5, value: [0.8,0.8,1,0] },
        { frame: 0.9, value: vec4.ZERO, ease: ease.sineIn }
    ], vec4.lerp),
    'conduit.transform.scale': PropertyAnimation([
        { frame: 0.5, value: [3,0,3] },
        { frame: 1.0, value: [2.5,4.5,2.5], ease: ease.cubicOut }
    ], vec3.lerp),
    'conduit.color': PropertyAnimation([
        { frame: 0.5, value: [1,0,0.3,0] },
        { frame: 0.8, value: [0.8,0.6,0.8,1], ease: ease.quadIn }
    ], vec4.lerp),
    'cube.light.intensity': PropertyAnimation([
        { frame: 0, value: 1 },
        { frame: 0.3, value: 0, ease: ease.quadIn }
    ], lerp)
}

const deactivateTimeline = {
    'bolts.rate': PropertyAnimation([
        { frame: 0, value: 0 }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0, value: 1 },
        { frame: 0.5, value: 0, ease: ease.quadIn }
    ], lerp),
    'tubeX.transform.scale': PropertyAnimation([
        { frame: 0, value: [1.4,6,1.4] },
        { frame: 0.5, value: [0,6,0], ease: ease.quadIn }
    ], vec3.lerp),
    'tubeZ.transform.scale': PropertyAnimation([
        { frame: 0, value: [1.4,6,1.4] },
        { frame: 0.5, value: [0,6,0], ease: ease.quadIn }
    ], vec3.lerp),
    'tubeX.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: [0.5,0,0,1], ease: ease.quadOut }
    ], vec4.lerp),
    'tubeZ.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: [0.5,0,0,1], ease: ease.quadOut }
    ], vec4.lerp),
    'conduit.transform.scale': PropertyAnimation([
        { frame: 0, value: [2.5,4.5,2.5] },
        { frame: 0.5, value: [4,0,4], ease: ease.sineIn }
    ], vec3.lerp),
    'conduit.color': PropertyAnimation([
        { frame: 0, value: [0.8,0.6,0.8,1] },
        { frame: 0.5, value: [0.5,0,0.2,1], ease: ease.quadOut }
    ], vec4.lerp),
    'cube.light.intensity': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.5, value: 1, ease: ease.quadIn }
    ], lerp)
}

export class RestoreSkill extends CubeSkill {
    public active: boolean = false
    tubeX: BatchMesh
    tubeZ: BatchMesh
    light: PointLight
    bolts: ParticleEmitter
    sparks: ParticleEmitter
    ring: Decal
    ringMaterial: DecalMaterial
    flash: Sprite
    conduit: BatchMesh
    constructor(context: Application, cube: Cube){
        super(context, cube)

        this.tubeX = new BatchMesh(SharedSystem.geometry.cylinder)
        this.tubeZ = new BatchMesh(SharedSystem.geometry.cylinder)

        this.tubeX.material = this.tubeZ.material = SharedSystem.materials.energyHalfPurpleMaterial

        this.ringMaterial = new DecalMaterial()
        this.ringMaterial.program = this.context.get(DecalPass).program
        this.ringMaterial.diffuse = SharedSystem.textures.ring

        this.flash = Sprite.create(BillboardType.None)
        this.flash.material = new SpriteMaterial()
        this.flash.material.program = this.context.get(ParticleEffectPass).program
        this.flash.material.diffuse = SharedSystem.textures.sparkle

        this.conduit = new BatchMesh(SharedSystem.geometry.openBox)
        this.conduit.material = SharedSystem.materials.stripesMaterial
    }
    public *activate(transform: mat4, orientation: quat): Generator<ActionSignal> {
        const mesh = this.cube.meshes[this.cube.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.sides[this.cube.side].type]]

        const origin = mat4.transform([0,1,0], this.cube.transform.matrix, vec3())

        this.tubeX.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.tubeX.transform.position)
        quat.axisAngle(vec3.AXIS_X, 0.5*Math.PI, this.tubeX.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.tubeX)
        this.tubeZ.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.tubeZ.transform.position)
        quat.axisAngle(vec3.AXIS_Z, 0.5*Math.PI, this.tubeZ.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.tubeZ)

        this.flash.transform = this.context.get(TransformSystem).create()
        vec3.add([0,1.2,0], origin, this.flash.transform.position)
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, this.flash.transform.rotation)
        this.context.get(ParticleEffectPass).add(this.flash)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create()
        vec3.add([0,2,0], origin, this.light.transform.position)
        vec3.set(0.6,0.6,1.0,this.light.color)

        this.ring = this.context.get(DecalPass).create(0)
        this.ring.material = this.ringMaterial
        this.ring.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.ring.transform.position)

        this.conduit.transform = this.context.get(TransformSystem).create()
        this.conduit.transform.parent = this.cube.transform
        this.context.get(ParticleEffectPass).add(this.conduit)

        this.bolts = SharedSystem.particles.bolts.add({
            uOrigin: vec3.add([0,0.5,0], origin, vec3()),
            uRadius: [1.5,2.5],
            uLifespan: [0.2,0.6,0,0],
            uGravity: [0,0,0],
            uRotation: [0,2*Math.PI],
            uOrientation: quat.IDENTITY,
            uSize: [0.6,1.8],
            uFrame: [3.4,4]
        })

        this.sparks = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.8,-0.1,0],
            uOrigin: vec3.add([0,0.5,0], origin, vec3()),
            uLength: [0.05,0.1],
            uGravity: [0,-9.8*2,0],
            uSize: [0.1,0.4],
            uRadius: [0.2,0.8],
            uForce: [7,10],
            uTarget: vec3.add([0,-0.5,0], origin, vec3()),
        })

        const animate = AnimationTimeline(this, activateTimeline)

        for(const duration = 1.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.activate(elapsedTime, mesh.armature)

            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        this.active = true

        SharedSystem.particles.sparks.remove(this.sparks)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(DecalPass).delete(this.ring)
        this.context.get(ParticleEffectPass).remove(this.flash)
    }
    public *close(): Generator<ActionSignal> {
        deactivate: {
            if(!this.active) break deactivate

            const animate = AnimationTimeline(this, deactivateTimeline)
    
            for(const duration = 0.5, startTime = this.context.currentTime; true;){
                const elapsedTime = this.context.currentTime - startTime
                animate(elapsedTime, this.context.deltaTime)
                if(elapsedTime > duration) break
                yield ActionSignal.WaitNextFrame
            }
            this.active = false

            SharedSystem.particles.bolts.remove(this.bolts)
            this.context.get(TransformSystem).delete(this.light.transform)
            this.context.get(TransformSystem).delete(this.conduit.transform)
            this.context.get(TransformSystem).delete(this.tubeX.transform)
            this.context.get(TransformSystem).delete(this.tubeZ.transform)
            this.context.get(PointLightPass).delete(this.light)

            this.context.get(ParticleEffectPass).remove(this.conduit)
            this.context.get(ParticleEffectPass).remove(this.tubeX)
            this.context.get(ParticleEffectPass).remove(this.tubeZ)
        }
        for(const generator = super.close(); true;){
            const iterator = generator.next()
            if(iterator.done) return iterator.value
            else yield iterator.value
        }
    }
    protected validate(): boolean {
        const terrain = this.context.get(TerrainSystem), tile = this.cube.tile
        for(let i = DirectionTile.length - 1; i >= 0; i--)
            if(terrain.getTile(tile[0] + DirectionTile[i][0], tile[1] + DirectionTile[i][1]) != null)
                return false
        for(let i = DirectionTile.length - 1; i >= 0; i--){
            const added = vec2.add(tile, DirectionTile[i], vec2())
            terrain.setTile(added[0], added[1], this.cube)
            this.cube.tiles.push(added)
        }
        return true
    }
    protected clear(): void {
        const terrain = this.context.get(TerrainSystem)
        while(this.cube.tiles.length > 1){
            const tile = this.cube.tiles.pop()
            terrain.setTile(tile[0], tile[1], null)
        }
    }
}