import { aabb2 } from '../../engine/math'
import { Application } from '../../engine/framework'
import { GroundPlane } from './GroundPlane'
import { MazeWall } from './MazeWall'

export class TerrainChunk {
    public static readonly chunkLOD = 16
    public static readonly chunkSize = 20
    public static readonly tileSize = 2
    public static readonly chunkTiles = TerrainChunk.chunkSize / TerrainChunk.tileSize
    public static readonly bounds: aabb2 = aabb2(0,0,TerrainChunk.chunkLOD,TerrainChunk.chunkLOD)

    public column: number
    public row: number
    public readonly columns: number = TerrainChunk.chunkTiles
    public readonly rows: number = TerrainChunk.chunkTiles
    public wall: MazeWall = new MazeWall(this.context)
    public plane: GroundPlane = new GroundPlane(this.context, this, TerrainChunk.chunkLOD, TerrainChunk.chunkLOD, TerrainChunk.chunkSize)
    public readonly grid: { weight: number }[] = Array(this.columns * this.rows).fill(null)
    public offsetX: number
    public offsetZ: number

    constructor(private readonly context: Application){}
    public mapRegion(bounds: aabb2, out: aabb2): aabb2 {
        const segments = TerrainChunk.chunkLOD + 1
        out[0] = Math.floor((bounds[0]/TerrainChunk.chunkSize -this.column + 0.5) * segments)
        out[1] = Math.floor((bounds[1]/TerrainChunk.chunkSize -this.row + 0.5) * segments)
        out[2] = Math.floor((bounds[2]/TerrainChunk.chunkSize -this.column + 0.5) * segments)
        out[3] = Math.floor((bounds[3]/TerrainChunk.chunkSize -this.row + 0.5) * segments)
        return aabb2.intersect(TerrainChunk.bounds, out, out)
    }
    public terraform(bounds: aabb2, brush: (x: number, z: number) => number){
        const segments = TerrainChunk.chunkLOD + 1, resolution = segments + 2
        const quadSize = TerrainChunk.chunkSize / TerrainChunk.chunkLOD
        const offsetX = -0.5*TerrainChunk.chunkSize + this.column * TerrainChunk.chunkSize
        const offsetZ = -0.5*TerrainChunk.chunkSize + this.row * TerrainChunk.chunkSize
        for(let c = bounds[0]; c <= bounds[2]; c++)
        for(let r = bounds[1]; r <= bounds[3]; r++){
            const index = (c + 1) * resolution + (r + 1)
            const x = offsetX + c * quadSize
            const z = offsetZ + r * quadSize
            this.plane.heightmap[index] = brush(x, z)
        }
    }
    public tileIndex(column: number, row: number): number {
        return (column + this.offsetX) + (row + this.offsetZ) * this.columns
    }
    public get<T extends { weight: number }>(column: number, row: number): T | void {
        const tileIndex = (column + this.offsetX) + (row + this.offsetZ) * this.columns
        return this.grid[tileIndex] as T
    }
    public set<T extends { weight: number }>(column: number, row: number, value: T): void {
        const tileIndex = (column + this.offsetX) + (row + this.offsetZ) * this.columns
        this.grid[tileIndex] = value
    }
    build(){
        this.plane.build()
        this.wall.build()
    }
    clear(){
        this.grid.fill(null)
        this.plane.clear()
        this.wall.clear()
    }
}