import { Application, ISystem } from '../../engine/framework'
import { vec2, vec3 } from '../../engine/math'
import { CameraSystem } from '../../engine/scene'
import { AudioSystem, AudioSource } from '../../engine/audio'
import { MeshMaterial } from '../../engine/materials'
import { MeshSystem } from '../../engine/components'
import { CubeSkills } from '../skills'
import { SharedSystem } from '../shared'
import { TerrainSystem } from '../terrain'
import { FadeEffect } from '../skills/effects/FadeEffect'
import { TurnBasedSystem } from './TurnBasedFlow'
import { CubeTileMap } from './CubeTileMap'
import { Indicator } from './Indicator'
import { Cube } from './Cube'

class ThemeMixer {
    private track: AudioSource
    private index: number = -1
    private volume: number = 0.8
    private readonly switch: boolean[] = Array(this.themes.length).fill(false)
    constructor(private readonly context: Application, private readonly themes: {
        clip: string
        in: number
        out: number
    }[]){}
    set(index: number, toggle: boolean): void {
        this.switch[index] = toggle
        let next = this.switch.length - 1
        while(!this.switch[next]) next--
        if(this.index === next) return
        const prev = this.index
        this.index = next

        if(prev != -1) this.track = void this.track.volume(this.themes[prev].out, 0).stop(this.themes[prev].out)
        if(next != -1){
            this.context.get(AudioSystem).clips[this.themes[next].clip].loop = 0
            this.track = this.context.get(AudioSystem).create(this.themes[next].clip, 'music', null)
            if(this.themes[next]) this.track.volume(0, 0)
            this.track.volume(this.themes[next].in, this.volume)
            this.track.play(0)
        }
    }
}

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
    public readonly theme = new ThemeMixer(this.context, [
        {clip:'assets/ambient_theme.mp3',in:0.5,out:1},
        {clip:'assets/menu_theme.mp3',in:0.5,out:2},
        {clip:'assets/conflict_theme.mp3',in:0,out:2},
        {clip:'assets/war_theme.mp3',in:0,out:2},
    ])

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
        this.theme.set(0, true)
    }
    public load(manifest, loaded, next: () => void): void {
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
        next()
    }
}