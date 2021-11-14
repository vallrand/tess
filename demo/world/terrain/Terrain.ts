import { Application, ISystem } from '../../engine/framework'
import { vec2, vec3, aabb2, vec4 } from '../../engine/math'
import { CameraSystem } from '../../engine/scene'

import { LevelGenerator } from './LevelGenerator'
import { Pathfinder } from './Pathfinder'

import { TerrainChunk } from './TerrainChunk'

export class TerrainSystem implements ISystem {
    private static readonly pool: TerrainChunk[] = []
    private readonly positionOffset = -0.5 * TerrainChunk.chunkSize + 0.5 * TerrainChunk.tileSize
    private readonly gridSize = 3
    private readonly gridBounds: aabb2 = aabb2()
    public readonly bounds: aabb2 = aabb2()
    public frame: number = 0
    private readonly chunks: TerrainChunk[] = Array(this.gridSize * this.gridSize)
    public readonly levelGenerator: LevelGenerator = new LevelGenerator(this.context, 64)
    public readonly pathfinder: Pathfinder = new Pathfinder(this.context, this.gridSize * TerrainChunk.chunkTiles)
    constructor(private readonly context: Application){}
    public update(): void {
        const { controller } = this.context.get(CameraSystem), position = controller.cameraTarget
        if(controller.frame == 0) return
        const offsetX = Math.floor(position[0] / TerrainChunk.chunkSize - 0.5*this.gridSize + 1)
        const offsetZ = Math.floor(position[2] / TerrainChunk.chunkSize - 0.5*this.gridSize + 1)
        if(this.gridBounds[0] == offsetX && this.gridBounds[1] == offsetZ && this.frame) return

        for(let i = this.chunks.length - 1; i >= 0; i--){
            const chunk = this.chunks[i]
            if(!chunk) continue
            const swap = (chunk.column - offsetX) + (chunk.row - offsetZ) * this.gridSize
            if(swap === i) continue
            if(
                chunk.column < offsetX ||
                chunk.row < offsetZ ||
                chunk.column >= offsetX + this.gridSize ||
                chunk.row >= offsetZ + this.gridSize
            ){
                chunk.clear()
                TerrainSystem.pool.push(chunk)
                this.chunks[i] = null
            }else{
                this.chunks[i] = this.chunks[swap]
                this.chunks[swap] = chunk
                i++
            }
        }
        this.frame = this.context.frame
        aabb2.set(offsetX, offsetZ, offsetX + this.gridSize, offsetZ + this.gridSize, this.gridBounds)
        vec4.scale(this.gridBounds, TerrainChunk.chunkTiles, this.bounds)
        
        pathfinder:{
            const { offset, size, weight } = this.pathfinder
            vec2.set(-offsetX * TerrainChunk.chunkTiles, -offsetZ * TerrainChunk.chunkTiles, offset)
            for(let x = size - 1; x >= 0; x--)
            for(let z = size - 1; z >= 0; z--){
                const tile = this.getTile(x - offset[0], z - offset[1])
                weight[x + z * size] = tile ? tile.weight : 1
            }
        }

        for(let x = this.gridSize - 1; x >= 0; x--)
        for(let z = this.gridSize - 1; z >= 0; z--){
            if(this.chunks[x + z * this.gridSize]) continue
            const column = x + offsetX, row = z + offsetZ
            const chunk = TerrainSystem.pool.pop() || new TerrainChunk(this.context)
            chunk.column = column
            chunk.row = row
            chunk.offsetX = -column * TerrainChunk.chunkTiles
            chunk.offsetZ = -row * TerrainChunk.chunkTiles
            this.chunks[x + z * this.gridSize] = chunk
            this.levelGenerator.populate(chunk)
            chunk.build()
        }
    }
    public clear(){
        for(let i = this.chunks.length - 1; i >= 0; i--){
            if(!this.chunks[i]) continue
            this.chunks[i].clear()
            this.chunks[i] = void TerrainSystem.pool.push(this.chunks[i])
        }
        aabb2.copy(aabb2.INFINITE, this.bounds)
        this.frame = 0
    }
    public chunk(column: number, row: number): TerrainChunk | null {
        const x = Math.floor(column / TerrainChunk.chunkTiles) - this.gridBounds[0]
        const z = Math.floor(row / TerrainChunk.chunkTiles) - this.gridBounds[1]
        if(x < 0 || z < 0 || x >= this.gridSize || z >= this.gridSize) return null
        return this.chunks[x + z * this.gridSize]
    }
    public getTile<T extends { weight: number }>(column: number, row: number): T | void {
        return this.chunk(column, row)?.get<T>(column, row)
    }
    public setTile<T extends { weight: number }>(column: number, row: number, value: T): void {
        this.chunk(column, row)?.set<T>(column, row, value)
        this.pathfinder.weight[this.pathfinder.tileIndex(column, row)] = value ? value.weight : 1
    }
    public tilePosition(column: number, row: number, out: vec3): vec3 {
        out[0] = TerrainChunk.tileSize * column + this.positionOffset
        out[2] = TerrainChunk.tileSize * row + this.positionOffset
        out[1] = this.chunk(column, row)?.plane.sample(out[0], out[2]) || 0
        return out
    }
    public snapToGround(position: vec3){
        const column = Math.round((position[0] - this.positionOffset) / TerrainChunk.tileSize)
        const row = Math.round((position[1] - this.positionOffset) / TerrainChunk.tileSize)
        position[1] = this.chunk(column, row)?.plane.sample(position[0], position[2]) || 0
    }
}