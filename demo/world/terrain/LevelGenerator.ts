import { vec2, range, vec3, quat, aabb2, smoothstep, randomInt, noise1D, noise2D, lerp } from '../../engine/math'
import { Application } from '../../engine/framework'
import { perlin2D } from './perlin'
import { TerrainChunk } from './TerrainChunk'
import { Workshop } from '../Workshop'
import { TerrainSystem } from './Terrain'

export class LevelGenerator {
    private static readonly tile: vec2 = vec2()
    public static readonly zoneSize = 64
    constructor(private readonly context: Application){}

    private random2D(seed0: number, seed1: number): () => number {
        const seed = 0x2611501 * noise2D(seed0, seed1, 0xD6)
        let hash = 0x1
        return () => hash = noise1D(hash, seed)
    }

    public populate(chunk: TerrainChunk){
        const zone0 = TerrainChunk.chunkTiles * chunk.column / LevelGenerator.zoneSize | 0
        const zone1 = TerrainChunk.chunkTiles * chunk.row / LevelGenerator.zoneSize | 0
        const offset0 = zone0 * LevelGenerator.zoneSize - TerrainChunk.chunkTiles * chunk.column
        const offset1 = zone1 * LevelGenerator.zoneSize - TerrainChunk.chunkTiles * chunk.row

        let random = this.random2D(zone0, zone1)

        chunk.terraform(
            aabb2.pad(TerrainChunk.bounds, 1, aabb2()),
            (x: number, z: number) => 8 * this.sampleDunes(x * 0.2, z * 0.2, 173)
        )

        workshop: {
            let c = offset0 + randomInt(1, LevelGenerator.zoneSize - 2, random)
            let r = offset1 + randomInt(1, LevelGenerator.zoneSize - 2, random)
            if(zone0 == 0 && zone1 == 0){
                c = offset0 + 4
                r = offset1 + 2
            }

            if(c < 0 || r < 0 || c >= TerrainChunk.chunkTiles || r >= TerrainChunk.chunkTiles) break workshop

            const workshop = new Workshop(this.context)
            workshop.place(c - offset0, r - offset1)
        }
        boss: {

        }
        random = this.random2D(chunk.column, chunk.row)
        const randomTile = this.randomTile(
            -chunk.offsetX, -chunk.offsetZ,
            TerrainChunk.chunkTiles, TerrainChunk.chunkTiles, random
        )
        resources: {
            const resources = this.context.get(TerrainSystem).resources
            for(let i = randomInt(0, 1, random); i > 0; i--){
                const tile = randomTile.next().value
                resources.create(tile[0], tile[1])
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