import { range, clamp, lerp, vec2, vec3, vec4, mat4, quat, ease } from '../../engine/math'
import { Application } from '../../engine/framework'
import { MeshSystem, Mesh } from '../../engine/Mesh'
import { TransformSystem, Transform } from '../../engine/scene/Transform'
import { ParticleEmitter } from '../../engine/particles'
import { KeyboardSystem } from '../../engine/Keyboard'
import { PointLightPass, PointLight } from '../../engine/deferred/PointLightPass'
import { TerrainSystem, TerrainChunk } from '../terrain'
import { modelAnimations } from '../animations/animations'
import { EmitterTrigger } from '../../engine/Animation'
import { Direction, CubeOrientation, DirectionAngle } from './CubeOrientation'
import { IActor, TurnBasedSystem, ActionSignal } from '../Actor'
import { PlayerSystem } from './Player'
import { cubeModules, CubeModule } from './CubeModules'
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

export class Cube implements IActor {
    order: number = 0
    prevAction: number
    hash: number = 0
    public transform: Transform
    public readonly meshes: Mesh[] = []
    public dust: ParticleEmitter
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

        const light = this.context.get(PointLightPass).create()
        light.transform = this.context.get(TransformSystem).create()
        light.transform.parent = this.transform
        light.transform.position[1] = 4
        light.radius = 12
        light.intensity = 1.0
        vec3.set(1,1,0.8,light.color)

        this.dust = SharedSystem.particles.dust.add({
            uOrigin: [0,0,0],
            uLifespan: [0.8,1.2,-0.16,0],
            uSize: [2,4],
            uRadius: [0.2,0.4],
            uForce: [4,8],
            uTarget: [0,-0.1,0],
            uGravity: [0.0, 9.8, 0.0],
            uRotation: [0, 2 * Math.PI],
            uAngular: [-Math.PI,Math.PI,0,0],
        })
    }
    installModule(side: number, direction: Direction, type: CubeModule){
        if(this.meshes[side]) this.context.get(MeshSystem).delete(this.meshes[side])
        const moduleSettings = cubeModules[type]
        const mesh = this.meshes[side] = this.context.get(MeshSystem).loadModel(moduleSettings.model)

        mesh.transform = this.transform
        mesh.program = this.state.side == side ? 1 : -1
        this.state.sides[side].direction = direction
        this.state.sides[side].type = type
        const rotation = DirectionAngle[(this.state.direction + this.state.sides[side].direction) % 4]
        quat.copy(rotation, mesh.armature.nodes[0].rotation)
        modelAnimations[moduleSettings.model].close(0, mesh.armature)

        this.hash = this.state.sides.reduce((hash, side) => (
            (hash * 4 * CubeModule.Max) + side.direction * CubeModule.Max + side.type
        ), 0)
    }
    kill(){}
    *execute(turn: number): Generator<ActionSignal> {
        const keys = this.context.get(KeyboardSystem)
        const state = this.state.sides[this.state.side]
        const moduleSettings = cubeModules[state.type]
        const mesh = this.meshes[this.state.side]
        idle: while(true){
            let direction = Direction.None
            if(keys.down('KeyA')) direction = Direction.Right
            else if(keys.down('KeyD')) direction = Direction.Left
            else if(keys.down('KeyW')) direction = Direction.Down
            else if(keys.down('KeyS')) direction = Direction.Up

            open:{
                const prev = state.open, delta = this.context.deltaTime
                if(prev > 0 && direction != Direction.None)
                    state.open = Math.min(0, delta - state.open)
                else if(prev == 0 && keys.down('Space'))
                    state.open = Math.min(1, delta)
                else if(prev != 0 && prev != 1) state.open = Math.min(prev > 0 ? 1 : 0, prev + delta)
                if(state.open != prev){
                    modelAnimations[moduleSettings.model].open(Math.abs(state.open), mesh.armature)
                    yield ActionSignal.WaitNextFrame
                    continue
                }
            }
            switch(state.type){
                case CubeModule.Railgun:
                case CubeModule.EMP:
                {
                    if(state.open != 1) break
                    if(!keys.down('Space')) break

                    const rotation = DirectionAngle[(this.state.direction + state.direction) % 4]
                    const skill = this.context.get(PlayerSystem).skills[state.type]
                    for(const generator = skill.activate(this.transform.matrix, rotation); true;){
                        const iterator = generator.next()
                        if(iterator.done) return iterator.value
                        else yield iterator.value
                    }
                }
                // case CubeModule.Empty: {
                // }
                // case CubeModule.Machinegun: {
    
                // }
                case CubeModule.Shield: {
                    if(state.open != 1) break
                    //if(!keys.down('Space')) break
                    const shield = this.context.get(PlayerSystem).shield.create()
                    shield.transform = this.context.get(TransformSystem).create()
                    shield.transform.parent = this.transform
                    vec3.copy([0,0,0], shield.transform.scale)
                    const _ease = ease.elasticOut(1,0.75)

                    for(let duration = 1.0, startTime = this.context.currentTime; true;){
                        let fraction = (this.context.currentTime - startTime) / duration
                        vec3.lerp(vec3.ZERO, [3,5,3], _ease(Math.min(1, fraction)), shield.transform.scale)
                        shield.transform.frame = 0
                        modelAnimations[moduleSettings.model].activate(fraction % 1, mesh.armature)
                        //if(fraction >= 1) break
                        yield ActionSignal.WaitNextFrame
                    }
                }
            }
            movement: {
                if(state.open != 0 || direction == Direction.None) break movement
                const move = this.moveTransition(direction)
                if(!move) break movement
                this.prevAction = this.context.get(TurnBasedSystem).start(move, false)
                break idle
            }
            yield ActionSignal.WaitNextFrame
        }
    }
    private moveTransition(direction: Direction): Generator<ActionSignal> {
        const nextOrientation = CubeOrientation.roll(CubeOrientation(this.state.side, this.state.direction), direction)
        const nextDirection = nextOrientation & 0x3
        const nextFace = nextOrientation >>> 2
        const nextTile = vec2.copy(this.state.tile, vec2())

        console.log(`F ${this.state.side}-${nextFace} D ${this.state.direction}-${nextDirection} > ${direction}`)

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

        this.meshes[this.state.side].program = -1
        this.meshes[nextFace].program = 1
        this.state.direction = nextDirection
        this.state.side = nextFace
        this.context.get(TerrainSystem).setTile(this.state.tile[0], this.state.tile[1], null)
        this.context.get(TerrainSystem).setTile(nextTile[0], nextTile[1], this)
        vec2.copy(nextTile, this.state.tile)

        const mesh = this.meshes[this.state.side]
        const moduleSettings = cubeModules[this.state.sides[this.state.side].type]
        modelAnimations[moduleSettings.model].close(0, mesh.armature)

        const rootNode = mesh.armature.nodes[0]
        const prevPosition = vec3.copy(mesh.transform.position, vec3())
        const nextPosition = this.context.get(TerrainSystem).tilePosition(this.state.tile[0], this.state.tile[1], vec3())

        quat.multiply(prevRotation, nextRotation, prevRotation)
        const pivotOffset = vec3.subtract(nextPosition, pivot, vec3())
        quat.transform(pivot, quat.conjugate(nextRotation, quat()), pivot)
        
        return function*(this: Cube){
            const dustTrigger = EmitterTrigger({
                frame: 0.36, value: 16, origin: nextPosition, target: vec3.add(nextPosition, [0,-0.2,0], vec3())
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