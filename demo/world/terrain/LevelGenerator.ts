import { vec2, range, vec3, quat, aabb2, smoothstep, randomInt, noise1D, noise2D, lerp } from '../../engine/math'
import { Application } from '../../engine/framework'
import { perlin2D } from './perlin'
import { TerrainChunk } from './TerrainChunk'
import { EconomySystem, Workshop } from '../economy'
import { TerrainSystem } from './Terrain'
import { TextureMapGenerator } from './WaveFunctionCollapse'

const WALL = 0xFF000000
const DOOR = 0xFFFFFF00
const ____ = 0xFFFFFFFF
const MARK = 0xFF0000FF
const SHOP = 0xFFFF0000
const ruinsTextureMap = new ImageData(new Uint8ClampedArray(new Uint32Array([
    ____,____,____,____,____,____,____,____,____,____,____,____,____,____,____,____,
    ____,DOOR,DOOR,DOOR,____,____,____,____,____,____,____,____,____,____,____,____,
    ____,DOOR,MARK,DOOR,____,____,____,WALL,WALL,WALL,WALL,DOOR,WALL,WALL,WALL,____,
    ____,DOOR,DOOR,DOOR,____,____,____,WALL,____,____,____,____,____,____,WALL,____,
    ____,____,____,____,____,____,____,WALL,____,____,____,____,____,____,DOOR,____,
    ____,____,____,____,____,WALL,WALL,WALL,DOOR,WALL,WALL,WALL,____,____,WALL,DOOR,
    ____,____,____,____,____,WALL,____,____,____,____,____,WALL,____,____,____,DOOR,
    ____,____,WALL,____,____,DOOR,____,____,____,____,____,WALL,____,____,____,DOOR,
    ____,____,____,____,____,WALL,____,____,DOOR,WALL,WALL,WALL,WALL,DOOR,WALL,WALL,
    ____,WALL,WALL,DOOR,WALL,WALL,____,____,DOOR,____,____,WALL,____,____,WALL,____,
    ____,WALL,____,____,____,WALL,WALL,WALL,WALL,____,____,WALL,____,____,WALL,____,
    ____,WALL,____,____,____,____,____,____,WALL,____,____,DOOR,____,____,WALL,____,
    ____,DOOR,____,____,____,____,____,____,WALL,WALL,WALL,DOOR,DOOR,WALL,WALL,____,
    ____,WALL,____,____,____,____,____,____,WALL,____,____,____,____,____,____,____,
    ____,WALL,WALL,WALL,DOOR,DOOR,WALL,WALL,WALL,____,____,____,____,____,____,____,
    ____,____,____,____,____,____,____,____,____,____,WALL,____,____,____,____,____
]).buffer), 16, 16)

interface IZoneRegion {
    offsetX: number
    offsetY: number
    x: number
    y: number
    map: ImageData
    data: Uint32Array
}

export class LevelGenerator {
    private static readonly tile: vec2 = vec2()
    private readonly tilemap: TextureMapGenerator
    private readonly zones: IZoneRegion[] = []
    private readonly limit: number = 4
    constructor(private readonly context: Application, private readonly zoneSize: number){
        this.tilemap = new TextureMapGenerator(3, this.zoneSize + 1, this.zoneSize + 1, false, ruinsTextureMap, true, 8)
    }
    private random2D(seed0: number, seed1: number, seed2: number = 0xD6): () => number {
        const seed = 0x2611501 * noise2D(seed0, seed1, seed2)
        let hash = 0x1
        return () => hash = noise1D(hash * 0x7fffffff, seed)
    }
    private generateZone(zoneX: number, zoneY: number): IZoneRegion {
        for(let i = 0; i < this.zones.length; i++)
            if(this.zones[i].x === zoneX && this.zones[i].y === zoneY){
                if(i > 0) this.zones.unshift(this.zones.splice(i, 1)[0])
                return this.zones[i]
            }
        console.log(`%czone(${zoneX},${zoneY})`,'color:#5f8cb0;text-decoration:underline')
        const random = this.random2D(zoneX, zoneY, 0x4E43)
        
        this.tilemap.unset()
        for(let i = 0; i <= this.zoneSize; i++){
            this.tilemap.set(i, 0, ____)
            this.tilemap.set(i, this.zoneSize, ____)
            this.tilemap.set(0, i, ____)
            this.tilemap.set(this.zoneSize, i, ____)
        }
        const restore = []
        workshop: {
            const c = randomInt(2, this.zoneSize - 4, random)
            const r = randomInt(2, this.zoneSize - 4, random)
            for(let dx = -1; dx <= 1; dx++) for(let dy = -1; dy <= 1; dy++)
                this.tilemap.set(c + dx, r + dy, ____)
            restore.push(SHOP, c + r * this.tilemap.width)
        }

        for(let limit = 6; true; limit--)
            if(this.tilemap.generate(random, -1)) break
            else if(limit <= 0) throw `zone(${zoneX},${zoneY})`
        
        const zone = {
            x: zoneX, y: zoneY,
            offsetX: zoneX * this.zoneSize,
            offsetY: zoneY * this.zoneSize,
            map: this.zones.length >= this.limit ? this.zones.pop().map : null, data: null
        }
        zone.map = this.tilemap.graphics(zone.map)
        zone.data = new Uint32Array(zone.map.data.buffer)
        this.zones.unshift(zone)
        while(restore.length) zone.data[restore.pop()] = restore.pop()
        return zone
    }
    public sample(column: number, row: number): number {
        const zoneX = Math.floor(column / this.zoneSize)
        const zoneY = Math.floor(row / this.zoneSize)
        const zone = this.generateZone(zoneX, zoneY)
        const x = column - zone.offsetX, y = row - zone.offsetY
        const data = zone.map.data, index = 4 * (x + y * zone.map.width)
        return (
            (data[index + 3] << 24) |
            (data[index + 2] << 16) |
            (data[index + 1] << 8) |
            data[index + 0]
        ) >>> 0
    }
    public populate(chunk: TerrainChunk){
        const chunkSize = TerrainChunk.chunkTiles
        const random = this.random2D(chunk.column, chunk.row)

        chunk.terraform(
            aabb2.pad(TerrainChunk.bounds, 1, aabb2()),
            (x: number, z: number) => 8 * this.sampleDunes(x * 0.2, z * 0.2, 173)
        )

        for(let dx = 0; dx < chunkSize; dx++) for(let dy = 0; dy < chunkSize; dy++){
            const x = dx - chunk.offsetX, y = dy - chunk.offsetZ
            const C = this.sample(x, y)
            switch(C){
                case WALL: {
                    const L = this.sample(x - 1, y) === WALL ? 0x8 : 0
                    const R = this.sample(x + 1, y) === WALL ? 0x2 : 0
                    const U = this.sample(x, y - 1) === WALL ? 0x1 : 0
                    const D = this.sample(x, y + 1) === WALL ? 0x4 : 0
                    chunk.wall.set(x, y, U | R | D | L, random())
                    this.context.get(TerrainSystem).setTile(x, y, chunk.wall)
                    break
                }
                case MARK: {
                    this.context.get(EconomySystem).createDeposit(x, y, 4)
                    break
                }
                case SHOP: {
                    const workshop = new Workshop(this.context)
                    workshop.place(x, y)
                }
            }
        }
    }
    private sampleDunes(x: number, z: number, seed: number): number {
        const layer0 = Math.pow(1 - 2 * Math.abs(perlin2D(x * 0.5, z * 0.5, seed) - 0.5), 2)
        const layer1 = Math.pow(1 - 2 * Math.abs(perlin2D(x * 0.25, z * 0.25, seed) - 0.5), 2)
        const layer2 = smoothstep(0, 1, perlin2D(x * 0.2, z * 0.2, seed))
        return (layer0 * 1 + layer1 * 2 + layer2 * 4) / 7
    }
    private *randomTile(x: number, y: number, width: number, height: number, random: () => number): Generator<vec2, void, void> {
        const tiles = range(width * height)
        for(const tile = LevelGenerator.tile; tiles.length; tiles.length--){
            const index = randomInt(0, tiles.length - 1, random)
            tile[0] = x + tiles[index % width]
            tile[1] = y + tiles[index / width | 0]
            tiles[index] = tiles[tiles.length - 1]
            yield tile
        }
    }
}