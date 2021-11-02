import { Application } from '../../engine/framework'
import { vec2, vec3, vec4, quat, aabb2 } from '../../engine/math'
import { OpaqueLayer } from '../../engine/webgl'
import { TransformSystem } from '../../engine/scene'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, EventTrigger, ease } from '../../engine/animation'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType } from '../../engine/components'
import { ParticleEmitter } from '../../engine/particles'
import { ParticleEffectPass } from '../../engine/pipeline'
import { KeyboardSystem } from '../../engine/device'

import { TerrainSystem, IUnitTile } from '../terrain'
import { modelAnimations } from '../animations'
import { IActor, TurnBasedSystem } from '../common'
import { PlayerSystem, Cube, CubeModule, Direction } from '../player'
import { SharedSystem } from '../shared'

export class Workshop implements IActor, IUnitTile {
    public static readonly area: vec2[] = [
        [-1,-1],[1,-1],
        [-1,0],[1,0],
        [-1,1],[1,1]
    ]
    readonly weight: number = 0
    order: number = 1
    actionIndex: number
    mesh: Mesh
    tile: vec2 = vec2()
    opened: boolean = false

    private cover: Sprite
    private smoke: ParticleEmitter
    private glow: BatchMesh
    private cubeMesh: Mesh

    constructor(private readonly context: Application){}
    place(column: number, row: number){
        vec2.set(column, row, this.tile)
        this.mesh = this.context.get(MeshSystem).loadModel('dock')
        this.mesh.layer = OpaqueLayer.Static
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
            this.context.get(TerrainSystem).setTile(Workshop.area[i][0] + column, Workshop.area[i][1] + row, this)

        this.context.get(TurnBasedSystem).add(this)
    }
    delete(){
        if(!this.mesh) return
        this.context.get(TurnBasedSystem).remove(this)
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        this.mesh = null
    }
    *execute(): Generator<ActionSignal> {
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
                yield ActionSignal.WaitNextFrame
            }
        }else if(!cube){
            this.opened = false
            for(const duration = 0.64, startTime = this.context.currentTime; true;){
                const fraction = Math.min(1, (this.context.currentTime - startTime) / duration)
                modelAnimations.dock.open(1 - fraction, armature)
                if(fraction >= 1) break
                yield ActionSignal.WaitNextFrame
            }
        }else if(cube && cube.tile[1] === this.tile[1]){
            for(const generator = this.enterWorkshop(cube); true;){
                const iterator = generator.next()
                if(iterator.done) break
                else yield iterator.value
            }
        }
    }
    private *enterWorkshop(cube: Cube): Generator<ActionSignal> {
        yield this.context.get(AnimationSystem).await(cube.actionIndex)
        const mesh = this.cubeMesh = cube.meshes[cube.side]
        const prevPosition = vec3.copy(mesh.transform.position, vec3())
        const nextPosition = vec3.add(this.mesh.transform.position, [0,2,0], vec3())
        const cameraOffset = this.context.get(PlayerSystem).cameraOffset
        const prevCameraOffset = vec3.copy(cameraOffset, vec3())
        const nextCameraOffset = vec3(-2,4,2)

        lift: for(const duration = 1.0, startTime = this.context.currentTime; true;){
            const fraction = Math.min(1, (this.context.currentTime - startTime) / duration)
            modelAnimations.dock.lift(fraction, this.mesh.armature)
            vec3.lerp(prevPosition, nextPosition, ease.quadIn(fraction), mesh.transform.position)
            vec3.lerp(prevCameraOffset, nextCameraOffset, ease.quadInOut(fraction), cameraOffset)
            mesh.transform.frame = 0
            if(fraction >= 1) break
            yield ActionSignal.WaitNextFrame
        }
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
        const keys = this.context.get(KeyboardSystem)

        this.smoke = SharedSystem.particles.smoke.add({
            uOrigin: vec3.add(mesh.transform.position, [0,1,0], vec3()),
            uLifespan: [0.8,1.2,-0.2,0],
            uRotation: [0,2*Math.PI],
            uGravity: [0,10,0],
            uSize: [2,5],
            uFieldDomain: vec4.ONE,
            uFieldStrength: [8,0]
        })
        this.glow = BatchMesh.create(SharedSystem.geometry.openBox)
        this.glow.material = SharedSystem.materials.gradientMaterial
        this.glow.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, mesh.transform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.cover = Sprite.create()
        vec4.copy(vec4.ZERO, this.cover.color)
        this.cover.billboard = BillboardType.None
        this.cover.material = SharedSystem.materials.planeDissolveMaterial
        this.cover.transform = this.context.get(TransformSystem)
        .create([0,2.02,0], Sprite.FlatUp, vec3(2,2,2), mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cover)

        upgradeMenu: while(true){
            if(keys.down('KeyW') || keys.down('KeyS')) break upgradeMenu
            if(keys.trigger('KeyA')){
                availableModules.push(availableModules.shift())
                console.log('available', availableModules[0])
            }else if(keys.trigger('KeyD')){
                availableModules.unshift(availableModules.pop())
                console.log('available', availableModules[0])
            }else if(keys.trigger('Space')){
                const forward = (4-cube.direction)%4
                cube.installModule(cube.side, forward, availableModules[0])
                install: {
                    const animate = AnimationTimeline(this, {
                        'cubeMesh.color': PropertyAnimation([
                            { frame: 0, value: [8,0,2,0.2] },
                            { frame: 0.6, value: vec4.ONE, ease: ease.quadOut }
                        ], vec4.lerp),
                        'smoke': EventTrigger([
                            { frame: 0, value: 16 }
                        ], EventTrigger.emit),
                        'glow.transform.scale': PropertyAnimation([
                            { frame: 0, value: [2,0,2] },
                            { frame: 0.6, value: [2,6,2], ease: ease.quintOut }
                        ], vec3.lerp),
                        'glow.color': PropertyAnimation([
                            { frame: 0, value: [0.9,1,0.6,0] },
                            { frame: 0.6, value: vec4.ZERO, ease: ease.sineIn }
                        ], vec4.lerp),
                        'cover.color': PropertyAnimation([
                            { frame: 0, value: vec4.ONE },
                            { frame: 0.6, value: [1,0.6,0.2,0], ease: ease.sineOut }
                        ], vec4.lerp)
                    })
                    for(const duration = 0.6, startTime = this.context.currentTime; true;){
                        const elapsedTime = this.context.currentTime - startTime
                        animate(elapsedTime, this.context.deltaTime)
                        if(elapsedTime > duration) break
                        else yield ActionSignal.WaitNextFrame
                    }
                }
            }
            yield ActionSignal.WaitNextFrame
        }
        lower: for(const duration = 1.0, startTime = this.context.currentTime; true;){
            const fraction = Math.min(1, (this.context.currentTime - startTime) / duration)
            modelAnimations.dock.lift(1-fraction, this.mesh.armature)
            vec3.lerp(prevPosition, nextPosition, ease.quadIn(1-fraction), mesh.transform.position)
            vec3.lerp(prevCameraOffset, nextCameraOffset, ease.quadInOut(1-fraction), cameraOffset)
            mesh.transform.frame = 0
            if(fraction >= 1) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(ParticleEffectPass).remove(this.cover)
        this.context.get(ParticleEffectPass).remove(this.glow)
        Sprite.delete(this.cover)
        SharedSystem.particles.smoke.remove(this.smoke)
    }
}