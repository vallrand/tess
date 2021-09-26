import { clamp, lerp, vec2, vec3, vec4, mat4, quat, ease, aabb2, mat3x2 } from '../../engine/math'
import { Application, ISystem } from '../../engine/framework'
import { CameraSystem } from '../../engine/scene/Camera'
import { MaterialSystem, MeshMaterial } from '../../engine/materials'
import { AnimationSystem } from '../../engine/scene'
import { Cube } from './Cube'
import { CubeTileMap } from './CubeTileMap'
import { CubeModule } from './CubeModules'
import { CubeSkills } from '../skills'
import { SharedSystem } from '../shared'
import { MeshSystem } from '../../engine/components'
import { TerrainSystem } from '../terrain'
import { AISystem } from '../mechanics'
import { KeyboardSystem } from '../../engine/device'

export class PlayerSystem implements ISystem {
    public readonly cameraOffset: vec3 = vec3(0, 8, 4)
    public readonly cube: Cube = new Cube(this.context)
    public readonly tilemap: CubeTileMap = new CubeTileMap(this.context)
    public readonly skills = CubeSkills(this.context, this.cube)

    constructor(private readonly context: Application){
        window['orbit'] = (speed = 0.1) => setInterval(() => {
            this.cameraOffset[0] = 4 * Math.sin(speed * performance.now() / 1000)
            this.cameraOffset[2] = 4 * Math.cos(speed * performance.now() / 1000)
        }, 10)
    }
    public update(): void {
        if(this.context.frame == 1) this.cube.place(4, 6)
        if(this.context.frame == 1){
            this.cube.installModule(this.cube.state.side, 0, CubeModule.Railgun)
            this.cube['execute'] = function*(){}
            window['quat'] = quat
            window['vec3'] = vec3
            //this.context.get(TerrainSystem).resources.create(5,6)

            window['curUnit'] = 6

            // window['u0'] = this.context.get(AISystem).create(6,7,0)
            window['u1'] = this.context.get(AISystem).create(7,7,1)
            // window['u2'] = this.context.get(AISystem).create(7,8,2)
            window['u3'] = this.context.get(AISystem).create(2,6,3)
            // window['u4'] = this.context.get(AISystem).create(6,11,4)
            window['u5'] = this.context.get(AISystem).create(0,8,5)
            window['u6'] = this.context.get(AISystem).create(5,10,6)
            window['u7'] = this.context.get(AISystem).create(3,10,7)
            window['move'] = (path, unit) => this.context.get(AnimationSystem).start(unit.move(path), true)
            window['strike'] = (t, unit) => this.context.get(AnimationSystem).start(unit.strike(t), true)
            window['die'] = (unit) => this.context.get(AnimationSystem).start(unit.disappear(), true)
            window['app'].systems[17].cameraOffset= [4,6,3]//[2,5,3]//[5,6,2]//[3,7,6]//[3,6,-5]//[2,6,3]//[4,4,3]//[-4,5,-5]//[-4,8,3]//
        }
        const mainUnit = window['u' + window['curUnit']]
        this.tilemap.renderFaceTiles(this.cube)

        this.cube.meshes[this.cube.state.side].armature.frame = 0
        window['a'] = this.cube.meshes[this.cube.state.side].armature

        for(let i = 0; i <= 7; i++){
            const unit = window[`u${i}`]
            if(!unit) continue
           unit.mesh.armature.frame = 0
            window[`a${i}`] =unit.mesh.armature
        }

        const keys = this.context.get(KeyboardSystem)
        if(keys.trigger('KeyA')) window['move']([vec2.copy(mainUnit.tile, vec2()), vec2.add(mainUnit.tile, [-1,0], vec2())], mainUnit)
        else if(keys.trigger('KeyD')) window['move']([vec2.copy(mainUnit.tile, vec2()), vec2.add(mainUnit.tile, [1,0], vec2())], mainUnit)
        else if(keys.trigger('KeyW')) window['move']([vec2.copy(mainUnit.tile, vec2()), vec2.add(mainUnit.tile, [0,-1], vec2())], mainUnit)
        else if(keys.trigger('KeyS')) window['move']([vec2.copy(mainUnit.tile, vec2()), vec2.add(mainUnit.tile, [0,1], vec2())], mainUnit)
        else if(keys.trigger('Space')) window['strike']([], mainUnit)
        else if(keys.trigger('KeyX')) window['die'](mainUnit)
        
        vec3.copy(this.cameraOffset, this.context.get(CameraSystem).controller.cameraOffset)
        // this.context.get(CameraSystem).controller.adjustCamera(this.cube.transform.position)
        this.context.get(CameraSystem).controller.adjustCamera(mainUnit.mesh.transform.position || this.cube.transform.position)
    }
    load(){
        this.context.get(SharedSystem).grid.decal.transform.parent = this.cube.transform
        const models = this.context.get(MeshSystem).models
        const cubeMaterials: MeshMaterial[] = []
        for(let key in models){
            if(!models[key].material) continue
            models[key].material.array = SharedSystem.textures.indexedTexture.array
            models[key].material.arrayLayers = SharedSystem.textures.indexedTexture.arrayLayers
            if(key.indexOf('cube') != -1) cubeMaterials[models[key].material.index] = models[key].material
        }
        this.tilemap.extractTileMap(cubeMaterials.filter(Boolean), 512/8, 8)
    }
}