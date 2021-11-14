import { lerp, quat, vec2, vec3, vec4 } from '../../engine/math'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { TransformSystem } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { Sprite, BillboardType, BatchMesh } from '../../engine/components'
import { Decal, DecalPass, ParticleEffectPass } from '../../engine/pipeline'

import { SharedSystem, ModelAnimation } from '../shared'
import { DirectionTile } from '../player'
import { TerrainSystem } from '../terrain'
import { EconomySystem, ResourceSpot } from '../economy'
import { IUnitAttribute } from '../military'
import { CubeSkill } from './CubeSkill'

const actionTimeline = {
    'mesh.armature': ModelAnimation('loop'),
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
    'cracks.transform.rotation': EventTrigger([
        { frame: 0, value: null }
    ], (rotation: quat) => quat.axisAngle(vec3.AXIS_Y, 2*Math.PI*SharedSystem.random(), rotation)),
    'smoke.rate': PropertyAnimation([
        { frame: 0, value: 0.05 },
        { frame: 0.5, value: 0.01, ease: ease.quadIn },
        { frame: 1.0, value: 0, ease: ease.stepped }
    ], lerp)
}

export class ExtractSkill extends CubeSkill {
    indicator: IUnitAttribute = { capacity: 4, amount: 0 }
    deposit?: ResourceSpot

    private smoke: ParticleEmitter
    private cracks: Decal
    private tube: BatchMesh
    private beam: Sprite
    private ring: Sprite
    private glow: BatchMesh
    
    public query(): vec2 { return this.cube.tile }
    public update(): void {
        this.deposit = this.context.get(EconomySystem).get(this.cube.tile[0], this.cube.tile[1])
        this.indicator.amount = this.deposit ? Math.floor(this.deposit.amount * this.indicator.capacity) : 0
    }
    public *open(): Generator<ActionSignal> {
        const trigger = EventTrigger([{ frame: 0.6, value: { amount: 36, uOrigin: this.cube.transform.position } }], EventTrigger.emitReset)
        for(const generator = super.open(), startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            trigger(elapsedTime, this.context.deltaTime, this.cube.dust)
            const iterator = generator.next()
            if(iterator.done) return iterator.value
            else yield iterator.value
        }
    }
    public *activate(target: vec2): Generator<ActionSignal> {
        this.cube.action.amount = 0
        
        this.cracks = this.context.get(DecalPass).create(0)
        this.cracks.material = SharedSystem.materials.cracksMaterial
        this.cracks.transform = this.context.get(TransformSystem).create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.cube.transform)

        this.tube = BatchMesh.create(SharedSystem.geometry.cylinder)
        this.tube.material = SharedSystem.materials.effect.stripesRed
        this.tube.transform = this.context.get(TransformSystem).create([0,4,0], quat.IDENTITY, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.tube)

        this.beam = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.beam.material = SharedSystem.materials.sprite.beam
        this.beam.transform = this.context.get(TransformSystem).create([0,4,0], quat.IDENTITY, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.glow = BatchMesh.create(SharedSystem.geometry.cross)
        this.glow.material = SharedSystem.materials.gradientMaterial
        this.glow.transform = this.context.get(TransformSystem).create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.ring = Sprite.create(BillboardType.None)
        this.ring.material = SharedSystem.materials.sprite.ring
        this.ring.transform = this.context.get(TransformSystem).create([0,4,0], quat.HALF_N_X, vec3.ONE, this.cube.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.smoke = this.smoke || SharedSystem.particles.smoke.add({
            uLifespan: [1.0,2.0,0,0],
            uOrigin: vec3.add([0,4,0], this.cube.transform.position, vec3()),
            uRotation: [0,2*Math.PI],
            uGravity: [0,5.6,0],
            uSize: [1,4],
            uFieldDomain: [0.4,0.4,0.4,0],
            uFieldStrength: [4,0]
        })

        const animate = AnimationTimeline(this, actionTimeline)
        if(this.deposit && this.indicator.amount){
            this.indicator.amount--
            this.context.get(AnimationSystem).start(this.deposit.drain(1, 1 / this.indicator.capacity), true)
            this.cube.matter.amount = Math.min(this.cube.matter.capacity, this.cube.matter.amount + 1)
        }

        excavation: for(const duration = 2.0, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

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
        BatchMesh.delete(this.glow)
        BatchMesh.delete(this.tube)
        Sprite.delete(this.beam)
        Sprite.delete(this.ring)
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
        if(this.smoke) this.smoke = void SharedSystem.particles.smoke.remove(this.smoke)
        
        const terrain = this.context.get(TerrainSystem)
        while(this.cube.tiles.length > 1){
            const tile = this.cube.tiles.pop()
            terrain.setTile(tile[0], tile[1], null)
        }
    }
}

