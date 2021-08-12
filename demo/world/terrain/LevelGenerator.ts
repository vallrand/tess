import { vec3, quat, aabb2, smoothstep, randomInt, noise1D, noise2D, lerp } from '../../engine/math'
import { Application } from '../../engine/framework'
import { perlin2D } from './perlin'
import { TerrainChunk } from './TerrainChunk'
import { Workshop } from '../Workshop'

export class LevelGenerator {
    public static readonly zoneSize = 64
    constructor(private readonly context: Application){}

    public populate(chunk: TerrainChunk, column: number, row: number){
        const zone0 = TerrainChunk.chunkTiles * column / LevelGenerator.zoneSize | 0
        const zone1 = TerrainChunk.chunkTiles * row / LevelGenerator.zoneSize | 0
        const offset0 = zone0 * LevelGenerator.zoneSize - TerrainChunk.chunkTiles * column
        const offset1 = zone1 * LevelGenerator.zoneSize - TerrainChunk.chunkTiles * row

        const seed = noise2D(zone0, zone1, 0xD6)
        let hash = 0x1
        const random = () => hash = noise1D(hash, seed)

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
    }
    private sampleDunes(x: number, z: number, seed: number): number {
        const layer0 = Math.pow(1 - 2 * Math.abs(perlin2D(x * 0.5, z * 0.5, seed) - 0.5), 2)
        const layer1 = Math.pow(1 - 2 * Math.abs(perlin2D(x * 0.25, z * 0.25, seed) - 0.5), 2)
        const layer2 = smoothstep(0, 1, perlin2D(x * 0.2, z * 0.2, seed))
        return (layer0 * 1 + layer1 * 2 + layer2 * 4) / 7
    }
}