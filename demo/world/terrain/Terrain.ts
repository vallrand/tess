import { vec3, quat, aabb2 } from '../../engine/math'
import { Application, ISystem } from '../../engine/framework'
import { MaterialSystem, MeshMaterial } from '../../engine/Material'
import { ShaderProgram } from '../../engine/webgl'
import { shaders } from '../../engine/shaders'
import { PlayerSystem } from '../player'
import { TurnBasedSystem, IActor } from '../Actor'

import { LevelGenerator } from './LevelGenerator'

import { TerrainChunk } from './TerrainChunk'

export class TerrainSystem implements ISystem {
    private static readonly pool: TerrainChunk[] = []
    private readonly positionOffset = -0.5 * TerrainChunk.chunkSize + 0.5 * TerrainChunk.tileSize
    private readonly gridSize = 3
    private readonly gridBounds: aabb2 = aabb2()
    private readonly chunks: TerrainChunk[] = Array(this.gridSize * this.gridSize)
    private readonly levelGenerator: LevelGenerator = new LevelGenerator(this.context)

    private readonly dunesMaterial: MeshMaterial
    constructor(private readonly context: Application){
        const materials = this.context.get(MaterialSystem)
        this.dunesMaterial = materials.create()
        this.dunesMaterial.diffuse = materials.addRenderTexture(
            materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize), 0,
            ShaderProgram(this.context.gl, shaders.fullscreen_vert, require('../shaders/sandstone_frag.glsl')), {
                uScreenSize: [MaterialSystem.textureSize, MaterialSystem.textureSize]
            }, 0
        ).target
        this.dunesMaterial.normal = materials.addRenderTexture(
            materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize), 0,
            ShaderProgram(this.context.gl, shaders.fullscreen_vert, require('../shaders/dunes_frag.glsl')), {
                uScreenSize: [MaterialSystem.textureSize, MaterialSystem.textureSize]
            }, 0
        ).target
    }
    public update(): void {
        const position = this.context.get(PlayerSystem).cameraTarget
        const offsetX = Math.floor(position[0] / TerrainChunk.chunkSize - 0.5*this.gridSize + 1)
        const offsetZ = Math.floor(position[2] / TerrainChunk.chunkSize - 0.5*this.gridSize + 1)
        if(this.gridBounds[0] == offsetX && this.gridBounds[1] == offsetZ) return

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
        aabb2.set(offsetX, offsetZ, offsetX + this.gridSize - 1, offsetZ + this.gridSize - 1, this.gridBounds)

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
            this.levelGenerator.populate(chunk, column, row)
            chunk.build()
            chunk.mesh.material = this.dunesMaterial
        }
    }
    public chunk(column: number, row: number): TerrainChunk {
        const x = Math.floor(column / TerrainChunk.chunkTiles) - this.gridBounds[0]
        const z = Math.floor(row / TerrainChunk.chunkTiles) - this.gridBounds[1]
        if(x < 0 || z < 0 || x >= this.gridSize || z >= this.gridSize) return null
        return this.chunks[x + z * this.gridSize]
    }
    public getTile<T extends IActor>(column: number, row: number): T | void {
        return this.chunk(column, row)?.get<T>(column, row)
    }
    public setTile<T extends IActor>(column: number, row: number, value: T): void {
        this.chunk(column, row)?.set<T>(column, row, value)
    }
    public tilePosition(column: number, row: number, out: vec3): vec3 {
        out[0] = TerrainChunk.tileSize * column + this.positionOffset
        out[2] = TerrainChunk.tileSize * row + this.positionOffset
        out[1] = this.chunk(column, row)?.sample(out[0], out[2]) || 0
        return out
    }
}