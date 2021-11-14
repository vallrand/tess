import { lerp, quat, vec2, vec3, vec4 } from '../../engine/math'
import { ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { TransformSystem } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, BatchMesh } from '../../engine/components'
import { Decal, DecalPass, ParticleEffectPass, PointLightPass, PointLight } from '../../engine/pipeline'

import { SharedSystem, ModelAnimation } from '../shared'
import { DirectionTile } from '../player'
import { CubeSkill } from './CubeSkill'
import { TerrainSystem } from '../terrain'

const activateTimeline = {
    'mesh.armature': ModelAnimation('activate'),
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
    damage: number = 1
    private tubeX: BatchMesh
    private tubeZ: BatchMesh
    private light: PointLight
    private bolts: ParticleEmitter
    private sparks: ParticleEmitter
    private ring: Decal
    private flash: Sprite
    private conduit: BatchMesh
    public query(): vec2 { return this.cube.tile }
    private restore(): void {
        if(this.cube.matter.amount <= 0 || this.cube.health.amount >= this.cube.health.capacity) return
        this.cube.matter.amount--
        this.cube.health.amount = Math.min(this.cube.health.capacity, this.cube.health.amount + this.damage)
    }
    public *activate(): Generator<ActionSignal> {
        this.cube.action.amount = this.cube.movement.amount = 0
        if(this.active) return this.restore()

        this.tubeX = BatchMesh.create(SharedSystem.geometry.cylinder)
        this.tubeX.material = SharedSystem.materials.effect.energyHalfPurple
        this.tubeX.transform = this.context.get(TransformSystem).create(vec3.AXIS_Y, quat.HALF_X, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.tubeX)

        this.tubeZ = BatchMesh.create(SharedSystem.geometry.cylinder)
        this.tubeZ.material = SharedSystem.materials.effect.energyHalfPurple
        this.tubeZ.transform = this.context.get(TransformSystem).create(vec3.AXIS_Y, quat.HALF_Z, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.tubeZ)

        this.flash = Sprite.create(BillboardType.None)
        this.flash.material = SharedSystem.materials.sprite.sparkle
        this.flash.transform = this.context.get(TransformSystem).create([0,2.2,0], quat.HALF_N_X, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.flash)

        this.light = this.context.get(PointLightPass).create([0.6,0.6,1.0])
        this.light.transform = this.context.get(TransformSystem).create([0,3,0], quat.IDENTITY, vec3.ONE, this.cube.transform)

        this.ring = this.context.get(DecalPass).create(0)
        this.ring.material = SharedSystem.materials.decal.ring
        this.ring.transform = this.context.get(TransformSystem).create(vec3.AXIS_Y, quat.IDENTITY, vec3.ONE, this.cube.transform)

        this.conduit = BatchMesh.create(SharedSystem.geometry.openBox)
        this.conduit.material = SharedSystem.materials.effect.stripes
        this.conduit.transform = this.context.get(TransformSystem).create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.conduit)

        this.bolts = SharedSystem.particles.bolts.add({
            uOrigin: vec3.add([0,1.5,0], this.cube.transform.position, vec3()),
            uRadius: [1.5,2.5],
            uLifespan: [0.2,0.6,0,0],
            uGravity: vec3.ZERO,
            uRotation: [0,2*Math.PI],
            uOrientation: quat.IDENTITY,
            uSize: [0.6,1.8],
            uFrame: [3.4,4]
        })

        this.sparks = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.8,-0.1,0],
            uOrigin: vec3.add([0,1.5,0], this.cube.transform.position, vec3()),
            uLength: [0.05,0.1],
            uGravity: [0,-9.8*2,0],
            uSize: [0.1,0.4],
            uRadius: [0.2,0.8],
            uForce: [7,10],
            uTarget: [0,-1,0],
        })

        const animate = AnimationTimeline(this, activateTimeline)
        for(const duration = 1.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        this.active = true
        this.restore()

        SharedSystem.particles.sparks.remove(this.sparks)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(DecalPass).delete(this.ring)
        this.context.get(ParticleEffectPass).remove(this.flash)
        Sprite.delete(this.flash)
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
            BatchMesh.delete(this.tubeX)
            BatchMesh.delete(this.tubeZ)
            BatchMesh.delete(this.conduit)
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