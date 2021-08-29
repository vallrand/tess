import { vec2, vec3, quat, aabb2, ease } from '../engine/math'
import { Application } from '../engine/framework'
import { TransformSystem } from '../engine/scene/Transform'
import { MeshSystem, Mesh } from '../engine/Mesh'
import { KeyboardSystem } from '../engine/Keyboard'
import { TerrainSystem } from './terrain'
import { modelAnimations } from './animations/animations'
import { IActor, TurnBasedSystem, _ActionSignal } from './Actor'
import { PlayerSystem, Cube, CubeModule, Direction } from './player'

export class Workshop implements IActor {
    public static readonly area: vec2[] = [
        [-1,-1],[1,-1],
        [-1,0],[1,0],
        [-1,1],[1,1]
    ]
    order: number = 1
    prevAction: number
    mesh: Mesh
    tile: vec2 = vec2()
    opened: boolean = false
    constructor(private readonly context: Application){}
    place(column: number, row: number){
        vec2.set(column, row, this.tile)
        this.mesh = this.context.get(MeshSystem).loadModel('dock')
        this.mesh.transform = this.context.get(TransformSystem).create()
        const { position } = this.mesh.transform

        this.context.get(TerrainSystem).tilePosition(column, row, position)
        const chunk = this.context.get(TerrainSystem).chunk(column, row)
        const workshopArea: aabb2 = [
            position[0]-3, position[2]-3,
            position[0]+3, position[2]+3
        ]
        chunk.mapRegion(workshopArea, workshopArea)
        chunk.terraform(workshopArea, () => position[1])
        this.context.get(TerrainSystem).tilePosition(column, row, position)

        quat.axisAngle(vec3.AXIS_Y, 0.5 * Math.PI, this.mesh.armature.nodes[0].rotation)
        modelAnimations.dock.open(0, this.mesh.armature)

        for(let i = 0; i < Workshop.area.length; i++)
            chunk.set(Workshop.area[i][0] + column, Workshop.area[i][1] + row, this)

        this.context.get(TurnBasedSystem).add(this)
    }
    kill(){
        if(!this.mesh) return
        this.context.get(TurnBasedSystem).remove(this)
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        this.mesh = null
    }
    *execute(turn: number): Generator<_ActionSignal> {
        const armature = this.mesh.armature
        let cube: Cube = null
        for(let z = -2; z <= 2; z++){
            const entity = this.context.get(TerrainSystem).getTile(this.tile[0], this.tile[1] + z)
            if(!(entity instanceof Cube)) continue
            cube = entity
            break
        }
        if(!this.opened){
            if(!cube) return
            this.opened = true
            for(const duration = 0.64, startTime = this.context.currentTime; true;){
                const fraction = Math.min(1, (this.context.currentTime - startTime) / duration)
                modelAnimations.dock.open(fraction, armature)
                if(fraction >= 1) break
                yield _ActionSignal.WaitNextFrame
            }
        }else if(!cube){
            this.opened = false
            for(const duration = 0.64, startTime = this.context.currentTime; true;){
                const fraction = Math.min(1, (this.context.currentTime - startTime) / duration)
                modelAnimations.dock.open(1 - fraction, armature)
                if(fraction >= 1) break
                yield _ActionSignal.WaitNextFrame
            }
        }else if(cube && cube.state.tile[1] === this.tile[1]){
            yield _ActionSignal.WaitQueueEnd
            const mesh = cube.meshes[cube.state.side]
            const prevPosition = vec3.copy(mesh.transform.position, vec3())
            const nextPosition = vec3.add(this.mesh.transform.position, [0,2,0], vec3())
            const cameraOffset = this.context.get(PlayerSystem).cameraOffset
            const prevCameraOffset = vec3.copy(cameraOffset, vec3())
            const nextCameraOffset = vec3(-2,4,2)
            const availableModules = [
                CubeModule.Machinegun,
                CubeModule.Railgun,
                CubeModule.EMP,
                CubeModule.Voidgun,
                CubeModule.Repair,
                CubeModule.Minelayer,
                CubeModule.Auger,
                CubeModule.Shield,
                CubeModule.Missile
            ]
            lift: for(const duration = 1.0, startTime = this.context.currentTime; true;){
                const fraction = Math.min(1, (this.context.currentTime - startTime) / duration)
                modelAnimations.dock.lift(fraction, armature)
                vec3.lerp(prevPosition, nextPosition, ease.quadIn(fraction), mesh.transform.position)
                vec3.lerp(prevCameraOffset, nextCameraOffset, ease.quadInOut(fraction), cameraOffset)
                mesh.transform.frame = 0
                if(fraction >= 1) break
                yield _ActionSignal.WaitNextFrame
            }
            const keys = this.context.get(KeyboardSystem)
            upgradeMenu: while(true){
                if(keys.down('KeyW') || keys.down('KeyS')) break upgradeMenu
                if(keys.trigger('KeyA')){
                    availableModules.push(availableModules.shift())
                    console.log('available', availableModules[0])
                }else if(keys.trigger('KeyD')){
                    availableModules.unshift(availableModules.pop())
                    console.log('available', availableModules[0])
                }else if(keys.trigger('Space')){
                    const forward = (4-cube.state.direction)%4
                    cube.installModule(cube.state.side, forward, availableModules[0])
                }
                yield _ActionSignal.WaitNextFrame
            }
            lower: for(const duration = 1.0, startTime = this.context.currentTime; true;){
                const fraction = Math.min(1, (this.context.currentTime - startTime) / duration)
                modelAnimations.dock.lift(1-fraction, armature)
                vec3.lerp(prevPosition, nextPosition, ease.quadIn(1-fraction), mesh.transform.position)
                vec3.lerp(prevCameraOffset, nextCameraOffset, ease.quadInOut(1-fraction), cameraOffset)
                mesh.transform.frame = 0
                if(fraction >= 1) break
                yield _ActionSignal.WaitNextFrame
            }
        }
    }
}