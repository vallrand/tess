import { vec3 } from '../../engine/math'
import { createPlane } from '../../engine/geometry'
import { OpaqueLayer } from '../../engine/webgl'
import { Application } from '../../engine/framework'
import { MeshSystem, Mesh, MeshBuffer } from '../../engine/components/Mesh'
import { TransformSystem } from '../../engine/scene/Transform'
import { SharedSystem } from '../shared'

export class GroundPlane {
    public mesh: Mesh

    public readonly heightmap: Float32Array
    public readonly vertexArray: Float32Array
    public readonly vertexBuffer: MeshBuffer
    private readonly stride: number
    constructor(
        private readonly context: Application,
        private readonly columns: number,
        private readonly rows: number,
        private readonly size: number
    ){
        const { vertexArray, indexArray, format } = createPlane({
            columns, rows, width: this.size, height: this.size
        })
        this.heightmap = new Float32Array((columns + 3) * (rows + 3))
        this.vertexArray = vertexArray
        this.vertexBuffer = this.context.get(MeshSystem).uploadVertexData(vertexArray, indexArray, format)
        this.stride = this.vertexBuffer.format[1].stride >>> 2
    }
    build(column: number, row: number){
        const rows0 = this.rows + 1, rows1 = this.rows + 3
        for(let c = 0; c <= this.columns; c++)
        for(let r = 0; r <= this.rows; r++){
            const index = (c * rows0 + r) * this.stride
            this.vertexArray[index + 1] = this.heightmap[(c + 1) * rows1 + (r + 1)]
            const right = this.heightmap[(c + 2) * rows1 + (r + 1)]
            const left = this.heightmap[(c + 0) * rows1 + (r + 1)]
            const top = this.heightmap[(c + 1) * rows1 + (r + 2)]
            const bottom = this.heightmap[(c + 1) * rows1 + (r + 0)]

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
        vec3.set(column * this.size, 0, row * this.size, this.mesh.transform.position)
        this.mesh.material = SharedSystem.materials.dunesMaterial
    }
    clear(){
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        this.mesh = null
    }
    delete(){
        this.context.get(MeshSystem).unloadVertexData(this.vertexBuffer)
    }
}