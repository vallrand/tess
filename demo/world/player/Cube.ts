import { Application } from '../../engine/framework'
import { range, clamp, lerp, vec2, vec3, vec4, mat4, quat, ease } from '../../engine/math'
import { MeshSystem, Mesh } from '../../engine/components'
import { TransformSystem, Transform, EmitterTrigger, AnimationSystem, ActionSignal } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { KeyboardSystem } from '../../engine/device'
import { PointLightPass, PointLight } from '../../engine/pipeline'

import { modelAnimations, CubeModuleModel } from '../animations'
import { TurnBasedSystem, IActor } from '../mechanics'
import { Direction, CubeOrientation, DirectionAngle } from './CubeOrientation'
import { PlayerSystem } from './Player'
import { TerrainSystem, TerrainChunk, IUnit } from '../terrain'
import { CubeModule } from './CubeModules'
import { SharedSystem } from '../shared'


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

export class Cube implements IActor, IUnit {
    order: number = 0
    actionIndex: number
    hash: number = 0
    public transform: Transform
    public readonly meshes: Mesh[] = []
    public dust: ParticleEmitter
    public light: PointLight
    public state: CubeState = {
        tile: vec2(0, 0),
        side: 0, direction: Direction.Up,
        sides: range(6).map(i => ({
            type: CubeModule.Empty, direction: Direction.Up,
            level: 0, open: 0
        })),
        armor: 10
    }
    constructor(private readonly context: Application){
        this.transform = this.context.get(TransformSystem).create()
    }
    place(column: number, row: number){
        vec2.set(column, row, this.state.tile)
        this.context.get(TerrainSystem).tilePosition(column, row, this.transform.position)
        this.transform.frame = 0
        for(let i = 0; i < this.state.sides.length; i++)
            this.installModule(i, this.state.sides[i].direction, this.state.sides[i].type)

        this.context.get(TerrainSystem).setTile(this.state.tile[0], this.state.tile[1], this)
        this.context.get(TurnBasedSystem).add(this)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = this.context.get(TransformSystem).create()
        this.light.transform.parent = this.transform
        this.light.transform.position[1] = 4
        this.light.radius = 12
        this.light.intensity = 1.0
        vec3.set(1,1,0.8,this.light.color)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: [0,0,0],
            uLifespan: [0.8,1.2,-0.16,0],
            uSize: [2,4],
            uRadius: [0.2,0.4],
            uOrientation: quat.IDENTITY,
            uForce: [4,8],
            uTarget: [0,0,0],
            uGravity: [0.0, 9.8, 0.0],
            uRotation: [0, 2 * Math.PI],
            uAngular: [-Math.PI,Math.PI,0,0],
        })
    }
    installModule(side: number, direction: Direction, type: CubeModule){
        if(this.meshes[side]) this.context.get(MeshSystem).delete(this.meshes[side])
        const mesh = this.meshes[side] = this.context.get(MeshSystem).loadModel(CubeModuleModel[type])

        mesh.transform = this.transform
        mesh.color[3] = this.state.side == side ? 1 : 0
        this.state.sides[side].direction = direction
        this.state.sides[side].type = type
        const rotation = DirectionAngle[(this.state.direction + this.state.sides[side].direction) % 4]
        quat.copy(rotation, mesh.armature.nodes[0].rotation)
        modelAnimations[CubeModuleModel[type]].close(0, mesh.armature)

        this.hash = this.state.sides.reduce((hash, side) => (
            (hash * 4 * CubeModule.Max) + side.direction * CubeModule.Max + side.type
        ), 0)
    }
    kill(){}
    *execute(): Generator<ActionSignal, void> {
        const keys = this.context.get(KeyboardSystem)
        const state = this.state.sides[this.state.side]
        const mesh = this.meshes[this.state.side]
        const rotation = DirectionAngle[(this.state.direction + state.direction) % 4]
        const skill = this.context.get(PlayerSystem).skills[state.type]

        idle: for(let frame = 0; true;){
            if(frame === this.context.frame) yield ActionSignal.WaitNextFrame
            
            let direction = Direction.None
            if(keys.down('KeyA')) direction = Direction.Right
            else if(keys.down('KeyD')) direction = Direction.Left
            else if(keys.down('KeyW')) direction = Direction.Down
            else if(keys.down('KeyS')) direction = Direction.Up
            const trigger = keys.down('Space')
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

            switch(state.type){
                case CubeModule.Railgun:
                case CubeModule.Minelayer:
                case CubeModule.Voidgun:
                case CubeModule.EMP: {
                    if(state.open != 1) break
                    if(!trigger) break

                    for(const generator = skill.activate(this.transform.matrix, rotation); true;){
                        const iterator = generator.next()
                        if(iterator.done) return iterator.value
                        else yield iterator.value
                    }
                }
                case CubeModule.Missile:
                case CubeModule.Machinegun: {
                    if(state.open != 1) break
                    if(!trigger || direction === Direction.None) break

                    for(const generator = skill.activate(this.transform.matrix, rotation, direction); true;){
                        const iterator = generator.next()
                        if(iterator.done) return iterator.value
                        else yield iterator.value
                    }
                }
                case CubeModule.Repair:
                case CubeModule.Auger: {
                    if(state.open != 1) break
                    if(!trigger) break
                    if(skill.active) break

                    for(const generator = skill.activate(this.transform.matrix, rotation); true;){
                        const iterator = generator.next()
                        if(iterator.done) return iterator.value
                        else yield iterator.value
                    }
                }
                case CubeModule.Shield: {
                    if(state.open != 1) break
                    break
                }
            }
            movement: {
                if(state.open != 0 || direction == Direction.None) break movement
                const move = this.moveTransition(direction)
                if(!move) break movement
                this.actionIndex = this.context.get(AnimationSystem).start(move, true)
                break idle
            }
        }
    }
    public degrade(){
        const skill = this.context.get(PlayerSystem).skills[CubeModule.Death]
        this.context.get(AnimationSystem).start(skill.open(), true)
    }
    private moveTransition(direction: Direction): Generator<ActionSignal> {
        const nextOrientation = CubeOrientation.roll(CubeOrientation(this.state.side, this.state.direction), direction)
        const nextDirection = nextOrientation & 0x3
        const nextFace = nextOrientation >>> 2
        const nextTile = vec2.copy(this.state.tile, vec2())

        const prevRotation = quat()
        const nextRotation = DirectionAngle[(nextDirection + this.state.sides[nextFace].direction) % 4]
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

        console.log(`%cF ${this.state.side}-${nextFace} D ${this.state.direction}-${nextDirection} > ${direction}`,'color:#80dfaf;text-decoration:underline')

        this.meshes[this.state.side].color[3] = 0
        this.meshes[nextFace].color[3] = 1
        this.state.direction = nextDirection
        this.state.side = nextFace
        this.context.get(TerrainSystem).setTile(this.state.tile[0], this.state.tile[1], null)
        this.context.get(TerrainSystem).setTile(nextTile[0], nextTile[1], this)
        vec2.copy(nextTile, this.state.tile)

        const mesh = this.meshes[this.state.side]
        modelAnimations[CubeModuleModel[this.state.sides[this.state.side].type]].close(0, mesh.armature)

        const rootNode = mesh.armature.nodes[0]
        const prevPosition = vec3.copy(mesh.transform.position, vec3())
        const nextPosition = this.context.get(TerrainSystem).tilePosition(this.state.tile[0], this.state.tile[1], vec3())

        quat.multiply(prevRotation, nextRotation, prevRotation)
        const pivotOffset = vec3.subtract(nextPosition, pivot, vec3())
        quat.transform(pivot, quat.conjugate(nextRotation, quat()), pivot)

        this.context.get(PlayerSystem).tilemap.renderFaceTiles(this)
        
        return function*(this: Cube){
            const dustTrigger = EmitterTrigger({
                frame: 0.36, value: 16, origin: nextPosition, target: nextPosition
            })
            const movementEase = ease.bounceIn(0.064, 0.8)
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