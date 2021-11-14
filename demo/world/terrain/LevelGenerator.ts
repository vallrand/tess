import { Application } from '../../engine/framework'
import { aabb2, smoothstep, noise1D, noise2D, perlin2D, shuffle, hashCantor } from '../../engine/math'
import { EconomySystem } from '../economy'
import { AISystem } from '../military'
import { TerrainSystem } from './Terrain'
import { TerrainChunk } from './TerrainChunk'
import { TextureMapGenerator } from './WaveFunctionCollapse'
import { PoissonDisk } from './PoissonDisk'
import { Pathfinder } from './Pathfinder'

const ____ = 0xFF000000
const DOOR = 0xFF008000
const MARK = 0xFF00F000
const WALL = 0xFFFF0000
const SHOP = 0xFFFF8000
const UNIT = 0xFFFFF000
const ruinsTextureMap = new ImageData(new Uint8ClampedArray(new Uint32Array([
    ____,____,____,____,____,____,____,____,____,____,____,____,____,____,____,____,
    ____,DOOR,DOOR,DOOR,____,____,____,____,____,____,____,____,____,____,____,____,
    ____,DOOR,MARK,DOOR,____,____,____,WALL,WALL,WALL,WALL,DOOR,WALL,WALL,WALL,____,
    ____,DOOR,DOOR,DOOR,____,____,____,WALL,____,____,____,____,____,____,WALL,____,
    ____,____,____,____,____,____,____,WALL,____,____,____,____,____,____,DOOR,____,
    ____,____,____,____,____,WALL,WALL,WALL,DOOR,WALL,WALL,WALL,____,____,DOOR,____,
    ____,____,____,____,____,WALL,____,____,____,____,____,WALL,____,____,DOOR,____,
    ____,____,WALL,____,____,DOOR,____,____,____,____,____,WALL,____,____,WALL,____,
    ____,____,____,____,____,WALL,____,____,DOOR,WALL,WALL,WALL,WALL,DOOR,WALL,____,
    ____,WALL,WALL,DOOR,WALL,WALL,____,____,DOOR,____,____,WALL,____,____,WALL,____,
    ____,WALL,____,____,____,WALL,WALL,WALL,WALL,____,____,WALL,____,____,DOOR,____,
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
    static readonly initialSeeds: number[] = [
        0x9b0fdbc, 0x8436616, 0x7098712, 0x45fd318, 0x67a5fc3, 0xd69221a,
        0xf3a0178, 0xfe97438, 0xefdb85f, 0xc729803, 0x22c6c51, 0x3f87540,
        0xb0eea92, 0x6f02636, 0x49dca01, 0xfd703d3, 0x138068a, 0xdd5395b,
        0xd5948d7, 0x54f5418, 0x2bd7c7f, 0xd0abaa9, 0xa7720c8, 0xa098743
    ]
    private static readonly region: aabb2 = aabb2()
    private readonly tilemap: TextureMapGenerator
    private readonly groupSampler: PoissonDisk
    private readonly flags: Uint8Array
    private readonly stack: number[] = []
    private readonly zones: IZoneRegion[] = []
    private readonly limit: number = 4
    private readonly groupRadius: number = 16
    constructor(private readonly context: Application, public readonly zoneSize: number){
        this.tilemap = new TextureMapGenerator(3, this.zoneSize + 1, this.zoneSize + 1, false, ruinsTextureMap, true, 8)
        this.groupSampler = new PoissonDisk(this.zoneSize - this.groupRadius, this.zoneSize - this.groupRadius, this.groupRadius)
        this.flags = new Uint8Array(this.tilemap.width * this.tilemap.height)
    }
    private static random2D(seed0: number, seed1: number, seed2: number = 0xD6): () => number {
        const seed = 0x2611501 * noise2D(seed0, seed1, seed2)
        let hash = 0x1
        return () => hash = noise1D(hash * 0x7fffffff, seed)
    }
    public generateZone(zoneX: number, zoneY: number): IZoneRegion {
        for(let i = 0; i < this.zones.length; i++)
            if(this.zones[i].x === zoneX && this.zones[i].y === zoneY){
                if(i > 0) this.zones.unshift(this.zones.splice(i, 1)[0])
                return this.zones[0]
            }
        console.log(`%czone(${zoneX},${zoneY})`,'color:#5f8cb0;text-decoration:underline')
        const random = LevelGenerator.random2D(zoneX, zoneY, LevelGenerator.initialSeeds[0])

        this.tilemap.unset()
        for(let i = 0; i <= this.zoneSize; i++){
            this.tilemap.set(i, 0, ____)
            this.tilemap.set(i, this.zoneSize, ____)
            this.tilemap.set(0, i, ____)
            this.tilemap.set(this.zoneSize, i, ____)
        }
        this.groupSampler.clear()
        const encounters = this.groupSampler.fill(random, 10)

        for(let i = 0; i < encounters.length; i+=2){
            const c = 1 + encounters[i] | 0, r = 1 + encounters[i + 1] | 0
            for(let dx = -1; dx <= 1; dx++) for(let dy = -1; dy <= 1; dy++)
                this.tilemap.set(c + dx , r + dy, ____)
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

        const specialIndex = (random() * encounters.length) & ~1
        for(let i = 0; i < encounters.length; i+=2){
            const c = 1 + encounters[i] | 0, r = 1 + encounters[i + 1] | 0
            const index = c + r * this.tilemap.width
            if(i == 0){
                zone.data[index] = SHOP
                zone.data[c + (r + 2) * this.tilemap.width] = ____
                continue
            }else if(i === specialIndex){
                const special = AISystem.special(random())
                for(let dx = 0; dx < special.size; dx++) for(let dy = 0; dy < special.size; dy++)
                    zone.data[c + dx + (r + dy) * this.tilemap.width] = UNIT + (!dx && !dy ? special.value + 1 : 0)
            }
            const group = AISystem.groups[random() * AISystem.groups.length | 0]
            shuffle(group, random)
            this.stack.push(index)
            this.randomFill(zone.data, group, random)
        }
        return zone
    }
    private randomFill(grid: Uint32Array, values: number[], random: () => number){
        const neighbours = Pathfinder.neighbours.cardinal
        let limit = values.length - 1
        while(this.stack.length){
            const randomIndex = random() * this.stack.length | 0

            const c = this.stack[randomIndex] % this.tilemap.width
            const r = this.stack[randomIndex] / this.tilemap.width | 0

            if(randomIndex === this.stack.length - 1) this.stack.length--
            else this.stack[randomIndex] = this.stack.pop()

            if((grid[c + r * this.tilemap.width] & ~0xFF) >>> 0 !== UNIT){
                grid[c + r * this.tilemap.width] = UNIT + values[limit] + 1
                if(--limit < 0) break
            }

            for(let i = neighbours.length - 1; i >= 0; i--){
                const c1 = c + neighbours[i][0]
                const r1 = r + neighbours[i][1]
                if(c1 < 0 || r1 < 0 || c1 >= this.tilemap.width || r1 >= this.tilemap.height) continue
                const neighbour = c1 + r1 * this.tilemap.width
                if(this.flags[neighbour]) continue
                this.flags[neighbour] = 1
                this.stack.push(neighbour)
            }
        }
        this.flags.fill(0)
        this.stack.length = 0
    }
    public sample(column: number, row: number): number {
        const zoneX = Math.floor(column / this.zoneSize)
        const zoneY = Math.floor(row / this.zoneSize)
        const zone = this.generateZone(zoneX, zoneY)
        const x = column - zone.offsetX, y = row - zone.offsetY
        return zone.data[x + y * zone.map.width]
    }
    public populate(chunk: TerrainChunk): void {
        const chunkSize = TerrainChunk.chunkTiles
        const random = LevelGenerator.random2D(chunk.column, chunk.row)

        chunk.terraform(
            aabb2.pad(TerrainChunk.bounds, 1, LevelGenerator.region),
            (x: number, z: number) => 8 * this.sampleDunes(x * 0.2, z * 0.2, 173)
        )

        for(let dx = 0; dx < chunkSize; dx++) for(let dy = 0; dy < chunkSize; dy++){
            const x = dx - chunk.offsetX, y = dy - chunk.offsetZ
            const C = this.sample(x, y)
            switch((C & ~0xFF) >>> 0){
                case WALL: {
                    const L = this.sample(x - 1, y) === WALL ? 0x8 : 0
                    const R = this.sample(x + 1, y) === WALL ? 0x2 : 0
                    const U = this.sample(x, y - 1) === WALL ? 0x1 : 0
                    const D = this.sample(x, y + 1) === WALL ? 0x4 : 0
                    chunk.wall.set(x, y, U | R | D | L, random())
                    this.context.get(TerrainSystem).setTile(x, y, chunk.wall)
                    break
                }
                case MARK:
                    this.context.get(EconomySystem).createDeposit(x, y)
                    break
                case SHOP: 
                    this.context.get(EconomySystem).createWorkshop(x, y)
                    break
                case UNIT: {
                    const variation = C & 0xFF
                    if(!variation) break
                    const hash = hashCantor(x, y)
                    this.context.get(AISystem).create(x, y, variation - 1 as any, hash)
                    break
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
}