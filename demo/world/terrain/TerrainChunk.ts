import { vec3, aabb2 } from '../../engine/math'
import { createPlane } from '../../engine/geometry'
import { OpaqueLayer } from '../../engine/webgl'
import { Application } from '../../engine/framework'
import { MeshSystem, Mesh, MeshBuffer } from '../../engine/components/Mesh'
import { TransformSystem } from '../../engine/scene/Transform'

export interface IUnit {
    place(column: number, row: number): void
    kill(): void
}

export class TerrainChunk {
    public static readonly chunkLOD = 16
    public static readonly chunkSize = 20
    public static readonly tileSize = 2
    public static readonly chunkTiles = TerrainChunk.chunkSize / TerrainChunk.tileSize
    public static readonly bounds: aabb2 = aabb2(0,0,TerrainChunk.chunkLOD,TerrainChunk.chunkLOD)

    public column: number
    public row: number
    public mesh: Mesh
    public readonly list: IUnit[] = []
    public readonly grid: IUnit[] = Array(TerrainChunk.chunkTiles * TerrainChunk.chunkTiles).fill(null)
    public offsetX: number
    public offsetZ: number

    public readonly heightmap: Float32Array
    public readonly vertexArray: Float32Array
    public readonly vertexBuffer: MeshBuffer
    private readonly stride: number

    constructor(private readonly context: Application){
        const columns = TerrainChunk.chunkLOD, rows = TerrainChunk.chunkLOD
        const { vertexArray, indexArray, format } = createPlane({
            columns, rows, width: TerrainChunk.chunkSize, height: TerrainChunk.chunkSize
        })
        this.heightmap = new Float32Array((columns + 3) * (rows + 3))
        this.vertexArray = vertexArray
        this.vertexBuffer = this.context.get(MeshSystem).uploadVertexData(vertexArray, indexArray, format)
        this.stride = this.vertexBuffer.format[1].stride >>> 2
    }
    public sample(x: number, z: number): number {
        const segments = TerrainChunk.chunkLOD + 1, resolution = segments + 2
        const column = (x / TerrainChunk.chunkSize -this.column + 0.5) * segments
        const row = (z / TerrainChunk.chunkSize -this.row + 0.5) * segments
        const ic = column | 0, ir = row | 0
        return this.heightmap[(ic + 1) * resolution + (ir + 1)]
    }
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
            this.heightmap[index] = brush(x, z)
        }
    }
    public get<T extends IUnit>(column: number, row: number): T | void {
        const tileIndex = (column + this.offsetX) + (row + this.offsetZ) * TerrainChunk.chunkTiles
        return this.grid[tileIndex] as T
    }
    public set<T extends IUnit>(column: number, row: number, value: T): void {
        const tileIndex = (column + this.offsetX) + (row + this.offsetZ) * TerrainChunk.chunkTiles
        this.grid[tileIndex] = value
    }
    build(){
        const segments = TerrainChunk.chunkLOD + 1, resolution = segments + 2
        for(let c = 0; c < segments; c++)
        for(let r = 0; r < segments; r++){
            const index = (c * segments + r) * this.stride
            this.vertexArray[index + 1] = this.heightmap[(c + 1) * resolution + (r + 1)]
            const right = this.heightmap[(c + 2) * resolution + (r + 1)]
            const left = this.heightmap[(c + 0) * resolution + (r + 1)]
            const top = this.heightmap[(c + 1) * resolution + (r + 2)]
            const bottom = this.heightmap[(c + 1) * resolution + (r + 0)]

            const normal: vec3 = this.vertexArray.subarray(index + 3, index + 6) as any
            vec3.set(2 * (right - left), 4, 2 * (bottom - top), normal)
            vec3.normalize(normal, normal)
        }

        this.mesh = this.context.get(MeshSystem).create()
        this.context.get(MeshSystem).updateVertexData(this.vertexBuffer, this.vertexArray)
        this.mesh.layer = OpaqueLayer.Terrain
        this.mesh.buffer = this.vertexBuffer
        this.mesh.buffer.frame = 0
        this.mesh.transform = this.context.get(TransformSystem).create()
        vec3.set(this.column * TerrainChunk.chunkSize, 0, this.row * TerrainChunk.chunkSize, this.mesh.transform.position)
    }
    clear(){
        for(let i = this.grid.length - 1; i >= 0; i--)
            if(this.grid[i]) this.grid[i].kill()
        this.grid.fill(null)

        for(let i = this.list.length - 1; i >= 0; i--) this.list[i].kill()
        this.list.length = 0

        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        this.mesh = null
    }
    delete(){
        this.context.get(MeshSystem).unloadVertexData(this.vertexBuffer)
    }
}