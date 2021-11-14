import { Application, ISystem } from '../../engine/framework'
import { vec2, vec3 } from '../../engine/math'
import { CameraSystem } from '../../engine/scene'
import { MeshMaterial } from '../../engine/materials'
import { Cube } from './Cube'
import { CubeTileMap } from './CubeTileMap'
import { CubeSkills } from '../skills'
import { SharedSystem } from '../shared'
import { MeshSystem } from '../../engine/components'
import { TerrainSystem } from '../terrain'
import { TurnBasedSystem } from './TurnBasedFlow'
import { Indicator } from './Indicator'
import { FadeEffect } from '../skills/effects/FadeEffect'

export class PlayerSystem implements ISystem {
    static readonly input = {
        up: 'KeyW',
        down: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        action: 'Space'
    }
    public readonly origin: vec2 = vec2(4, 6)
    public readonly cameraOffset: vec3 = vec3(0, 8, 4)
    public readonly cube: Cube = new Cube(this.context)
    public readonly tilemap: CubeTileMap = new CubeTileMap(this.context)
    public readonly indicator: Indicator = new Indicator(this.context)
    public readonly skills = CubeSkills(this.context, this.cube)

    constructor(private readonly context: Application){
        this.context.get(TurnBasedSystem).add(this.cube)
    }
    public update(): void {
        if(this.context.frame == 0) return
        else if(this.context.frame == 1) this.restart()

        this.tilemap.renderFaceTiles(this.cube)
        this.indicator.update(this.cube)
        
        vec3.copy(this.cameraOffset, this.context.get(CameraSystem).controller.cameraOffset)
        this.context.get(CameraSystem).controller.adjustCamera(this.cube.transform.position, this.context.frame)
    }
    public restart(): void {
        FadeEffect.create(this.context, 1)
        this.cube.delete()
        this.context.get(TurnBasedSystem).signalReset.broadcast()
        this.context.get(TerrainSystem).tilePosition(this.origin[0], this.origin[1], this.cube.transform.position)
        this.context.get(CameraSystem).controller.adjustCamera(this.cube.transform.position, this.context.frame)
        this.context.get(TerrainSystem).clear()
        this.context.get(TerrainSystem).update()
        this.cube.place(this.origin[0], this.origin[1])
        vec3.set(0, 8, 4, this.cameraOffset)
    }
    public load(): void {
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