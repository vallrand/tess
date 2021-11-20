import { range, randomFloat, vec2, vec3, quat } from '../../engine/math'
import { MeshSystem, Mesh } from '../../engine/components'
import { TransformSystem, Transform } from '../../engine/scene'
import { AnimationSystem, ActionSignal, EventTrigger, ease } from '../../engine/animation'
import { ParticleEmitter } from '../../engine/particles'
import { KeyboardSystem } from '../../engine/device'
import { AudioSystem } from '../../engine/audio'
import { PointLightPass, PointLight } from '../../engine/pipeline'

import { TurnBasedSystem, IAgent } from './TurnBasedFlow'
import { Direction, CubeOrientation, DirectionAngle } from './CubeOrientation'
import { PlayerSystem } from './Player'
import { TerrainSystem, TerrainChunk } from '../terrain'
import { CubeModule } from './CubeModules'
import { SharedSystem, CubeModuleModel, ModelAnimation } from '../shared'
import { DamageEffect, DeathEffect } from '../skills/effects'
import { DamageType, Unit } from '../military'


export interface CubeState {
    tile: vec2
    side: number
    direction: Direction
    armor: number
    sides: {
        type: CubeModule
        direction: Direction
        open: number
        level: number
    }[]
}

export class Cube extends Unit implements IAgent {
    readonly weight: number = 0
    readonly matter = { capacity: 8, amount: 0, gain: 0 }
    readonly health = { capacity: 6, amount: 0, gain: 0 }
    readonly action = { capacity: 1, amount: 0, gain: 1 }
    readonly movement = { capacity: 1, amount: 0, gain: 1 }
    readonly order: number = 0
    readonly group: number = 1

    hash: number = 0
    public transform: Transform = this.context.get(TransformSystem).create()
    public readonly meshes: Mesh[] = []
    public dust: ParticleEmitter
    public light: PointLight

    public side: number = 0
    public direction: Direction = Direction.Up
    public readonly sides: {
        type: CubeModule
        direction: Direction
        open: number
        level: number
    }[] = range(6).map(i => ({
        type: CubeModule.Empty, direction: Direction.Up,
        level: 0, open: 0
    }))

    public readonly tiles: vec2[] = [this.tile]
    place(column: number, row: number){
        vec2.set(column, row, this.tile)
        this.context.get(TerrainSystem).tilePosition(column, row, this.transform.position)
        this.transform.frame = 0
        for(let i = 0; i < this.sides.length; i++)
            this.installModule(i, this.sides[i].direction, this.sides[i].type)

        this.context.get(TerrainSystem).setTile(this.tile[0], this.tile[1], this)

        this.light = this.context.get(PointLightPass).create([1,1,0.8])
        this.light.transform = this.context.get(TransformSystem).create()
        this.light.transform.parent = this.transform
        this.light.transform.position[1] = 4
        this.light.radius = 12
        this.light.intensity = 1.0

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: vec3.ZERO, uTarget: vec3.ZERO,
            uLifespan: [0.8,1.2,-0.16,0],
            uSize: [2,4],
            uRadius: [0.2,0.4],
            uOrientation: quat.IDENTITY,
            uForce: [4,8],
            uGravity: [0.0, 9.8, 0.0],
            uRotation: [0, 2 * Math.PI],
            uAngular: [-Math.PI,Math.PI,0,0],
        })
        this.health.amount = this.health.capacity

        this.context.get(TurnBasedSystem).signalEnterTile.broadcast(this.tile[0], this.tile[1], this)
    }
    installModule(side: number, direction: Direction, type: CubeModule){
        if(this.meshes[side]) this.context.get(MeshSystem).delete(this.meshes[side])
        const mesh = this.meshes[side] = this.context.get(MeshSystem).loadModel(CubeModuleModel[type])

        mesh.transform = this.transform
        mesh.color[3] = this.side == side ? 1 : 0
        this.sides[side].direction = direction
        this.sides[side].type = type
        const rotation = DirectionAngle[(this.direction + this.sides[side].direction) % 4]
        quat.copy(rotation, mesh.armature.nodes[0].rotation)
        ModelAnimation.map[mesh.armature.key].close(0, mesh.armature)

        this.hash = this.sides.reduce((hash, side) => (
            (hash * 4 * CubeModule.Max) + side.direction * CubeModule.Max + side.type
        ), 0)
        this.skill.update()
    }
    delete(){
        for(let i = 0; i < this.meshes.length; i++)
            if(this.meshes[i]) this.meshes[i] = void this.context.get(MeshSystem).delete(this.meshes[i])
        if(this.dust) this.dust = void SharedSystem.particles.dust.remove(this.dust)
        if(this.light) this.light = void this.context.get(PointLightPass).delete(this.light)
    }
    get skill(){ return this.context.get(PlayerSystem).skills[this.sides[this.side].type] }
    *death(): Generator<ActionSignal> {
        this.context.get(PlayerSystem).theme.set(0, false)
        if(this.sides[this.side].open == 1)
        for(const generator = this.skill.close(); true;){
            const iterator = generator.next()
            if(iterator.done) break
            else yield iterator.value
        }
        const effect = DeathEffect.create(this.context, this)
        const waiter = this.context.get(AnimationSystem).await(effect.index)
        const keys = this.context.get(KeyboardSystem)
        const camera = this.context.get(PlayerSystem).cameraOffset
        const orbitDuration = 0.1, orbitRadius = 4
        for(const startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            camera[0] = orbitRadius * Math.sin(elapsedTime * orbitDuration)
            camera[2] = orbitRadius * Math.cos(elapsedTime * orbitDuration)
            if(!keys.release('Space') || !waiter.continue) yield ActionSignal.WaitNextFrame
            else{
                this.context.get(PlayerSystem).restart()
                break
            }
        }
    }
    *execute(): Generator<ActionSignal, void> {
        const keys = this.context.get(KeyboardSystem)
        if(this.health.amount === 0) for(const generator = this.death(); true;){
            const iterator = generator.next()
            if(iterator.done) return iterator.value
            else yield iterator.value
        }
        
        this.regenerate()
        this.skill.update()
        idle: for(let frame = 0; true;){
            if(this.action.amount <= 0 && this.movement.amount <= 0) break
            if(frame === this.context.frame) yield ActionSignal.WaitNextFrame

            const state = this.sides[this.side]
            const rotation = DirectionAngle[(this.direction + state.direction) % 4]
            const skill = this.context.get(PlayerSystem).skills[state.type]
            
            let direction = Direction.None, intentional = false
            for(let key in PlayerSystem.input) if(keys.trigger(PlayerSystem.input[key])) intentional = true
            if(keys.down(PlayerSystem.input.left)) direction = Direction.Right
            else if(keys.down(PlayerSystem.input.right)) direction = Direction.Left
            else if(keys.down(PlayerSystem.input.up)) direction = Direction.Down
            else if(keys.down(PlayerSystem.input.down)) direction = Direction.Up
            const trigger = keys.down(PlayerSystem.input.action)
            frame = this.context.frame

            if(state.open == 0 && trigger)
                for(const generator = skill.open(); true;){
                    const iterator = generator.next()
                    if(iterator.done) continue idle
                    else yield iterator.value
                }
            else if(state.open == 1 && !trigger && direction != Direction.None)
                for(const generator = skill.close(); true;){
                    const iterator = generator.next()
                    if(iterator.done) continue idle
                    else yield iterator.value
                }

            action: {
                if(state.open != 1 || !trigger) break action
                if(this.action.amount <= 0)
                    if(intentional) return void (this.movement.amount = 0)
                    else break action
                const target = skill.query(direction)
                if(!target) break action
                for(const generator = skill.activate(target, direction); true;){
                    const iterator = generator.next()
                    if(iterator.done) continue idle
                    else yield iterator.value
                }
            }
            movement: {
                if(state.open != 0 || direction == Direction.None || trigger) break movement
                if(this.movement.amount <= 0) return void (this.action.amount = 0)
                const move = this.moveTransition(direction)
                if(!move) break movement
                this.movement.amount--
                while(true){
                    const iterator = move.next()
                    if(iterator.done) continue idle
                    else yield iterator.value
                }
            }
        }
    }
    public damage(amount: number, type: DamageType){
        if(this.sides[this.side].type === CubeModule.Shield && this.skill.active && --this.skill.indicator.amount > 0) return
        if(type & DamageType.Immobilize) this.action.amount = -this.action.gain
        this.health.amount = Math.max(0, this.health.amount - amount)
        DamageEffect.create(this.context, this, type)
    }
    private moveTransition(direction: Direction): Generator<ActionSignal> {
        const nextOrientation = CubeOrientation.roll(CubeOrientation(this.side, this.direction), direction)
        const nextDirection = nextOrientation & 0x3
        const nextFace = nextOrientation >>> 2
        const nextTile = vec2.copy(this.tile, vec2())

        const prevRotation = quat()
        const nextRotation = DirectionAngle[(nextDirection + this.sides[nextFace].direction) % 4]
        const pivot = vec3()
        switch(direction){
            case Direction.Right: {
                nextTile[0]--
                quat.axisAngle(vec3.AXIS_Z, -0.5 * Math.PI, prevRotation)
                pivot[0] = -0.5 * TerrainChunk.tileSize
                break
            }
            case Direction.Left: {
                nextTile[0]++
                quat.axisAngle(vec3.AXIS_Z, 0.5 * Math.PI, prevRotation)
                pivot[0] = 0.5 * TerrainChunk.tileSize
                break
            }
            case Direction.Up: {
                nextTile[1]++
                quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, prevRotation)
                pivot[2] = 0.5 * TerrainChunk.tileSize
                break
            }
            case Direction.Down: {
                nextTile[1]--
                quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, prevRotation)
                pivot[2] = -0.5 * TerrainChunk.tileSize
                break
            }
        }
        if(this.context.get(TerrainSystem).getTile(nextTile[0], nextTile[1]) != null) return

        console.log(`%cF ${this.side}-${nextFace} D ${this.direction}-${nextDirection} > ${direction}`,'color:#80dfaf;text-decoration:underline')

        this.meshes[this.side].color[3] = 0
        this.meshes[nextFace].color[3] = 1
        this.direction = nextDirection
        this.side = nextFace
        this.context.get(TerrainSystem).setTile(this.tile[0], this.tile[1], null)
        this.context.get(TerrainSystem).setTile(nextTile[0], nextTile[1], this)
        vec2.copy(nextTile, this.tile)
        this.context.get(TurnBasedSystem).signalEnterTile.broadcast(nextTile[0], nextTile[1], this)
        this.skill.update()

        const mesh = this.meshes[this.side]
        ModelAnimation.map[mesh.armature.key].close(0, mesh.armature)

        const rootNode = mesh.armature.nodes[0]
        const prevPosition = vec3.copy(mesh.transform.position, vec3())
        const nextPosition = this.context.get(TerrainSystem).tilePosition(this.tile[0], this.tile[1], vec3())

        quat.multiply(prevRotation, nextRotation, prevRotation)
        const pivotOffset = vec3.subtract(nextPosition, pivot, vec3())
        quat.transform(pivot, quat.conjugate(nextRotation, quat()), pivot)

        this.context.get(PlayerSystem).tilemap.renderFaceTiles(this)
        
        return function*(this: Cube){
            const dustTrigger = EventTrigger([{
                frame: 0.36, value: { amount: 16, uOrigin: nextPosition, uTarget: vec3.ZERO }
            }], EventTrigger.emitReset)
            const movementEase = ease.bounceIn(0.064, 0.8)
            this.context.get(AudioSystem)
            .create('assets/cube_step.mp3', 'sfx', this.transform)
            .volume(0, 0.4)
            .play(0.5, randomFloat(0.84, 1.16, SharedSystem.random()))
            for(const duration = 0.64, startTime = this.context.currentTime; true;){
                const elapsedTime = this.context.currentTime - startTime
                const fraction = Math.min(1, elapsedTime / duration)

                mesh.transform.frame = 0
                mesh.armature.frame = 0
                vec3.lerp(prevPosition, nextPosition, fraction, mesh.transform.position)

                quat.slerp(prevRotation, nextRotation, movementEase(fraction), rootNode.rotation)
                quat.normalize(rootNode.rotation, rootNode.rotation)

                quat.transform(pivot, rootNode.rotation, rootNode.position)
                vec3.subtract(rootNode.position, mesh.transform.position, rootNode.position)
                vec3.add(pivotOffset, rootNode.position, rootNode.position)
                rootNode.position[1] += mesh.transform.position[1] - nextPosition[1]

                dustTrigger(elapsedTime, this.context.deltaTime, this.dust)

                if(fraction >= 1) break
                yield ActionSignal.WaitNextFrame
            }
        }.call(this)
    }
}