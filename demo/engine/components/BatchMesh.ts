import { Application } from '../framework'
import { ICamera } from '../scene/Camera'
import { lerp, mat3, mat4, vec2, vec3, vec4 } from '../math'
import { Transform } from '../scene/Transform'
import { IBatched } from '../pipeline/batch/GeometryBatch'
import { IVertexAttribute } from '../webgl'
import { BoundingVolume, calculateBoundingRadius } from '../scene/FrustumCulling'
import { SpriteMaterial } from '../materials'

export class BatchMesh implements IBatched {
    public index: number = -1
    public frame: number = 0
    public order: number = 0
    public readonly _vertices: Float32Array
    public readonly vertices: Float32Array
    public readonly uvs: Float32Array
    public readonly normals: Float32Array
    public readonly indices: Uint16Array
    public readonly color: vec4 = vec4(1,1,1,1)
    public material: SpriteMaterial
    public transform: Transform
    private readonly boundingRadius: number
    public readonly bounds = new BoundingVolume

    constructor(geometry: {
        format: IVertexAttribute[]
        vertexArray: Float32Array
        indexArray: Uint16Array
    }){
        this.indices = geometry.indexArray
        this._vertices = geometry.vertexArray
        const length = geometry.vertexArray.byteLength / geometry.format[1].stride
        this.vertices = new Float32Array(length * 3)
        this.uvs = new Float32Array(length * 2)
        this.normals = new Float32Array(length * 3)
        this.boundingRadius = calculateBoundingRadius(
            geometry.vertexArray,
            geometry.format[1].stride / Float32Array.BYTES_PER_ELEMENT,
            geometry.format[1].offset / Float32Array.BYTES_PER_ELEMENT
        )
    }

    public update(context: Application, camera: ICamera){
        if(this.frame > 0 && this.frame >= this.transform.frame) return
        this.frame = context.frame

        const length = this.vertices.length / 3
        const modelMatrix = this.transform.matrix
        const normalMatrix = this.transform.calculateNormalMatrix()
        for(let i = length - 1; i >= 0; i--){
            const x = this._vertices[i * 8 + 0]
            const y = this._vertices[i * 8 + 1]
            const z = this._vertices[i * 8 + 2]
            this.vertices[i * 3 + 0] = modelMatrix[0] * x + modelMatrix[4] * y + modelMatrix[8] * z + modelMatrix[12]
            this.vertices[i * 3 + 1] = modelMatrix[1] * x + modelMatrix[5] * y + modelMatrix[9] * z + modelMatrix[13]
            this.vertices[i * 3 + 2] = modelMatrix[2] * x + modelMatrix[6] * y + modelMatrix[10] * z + modelMatrix[14]

            this.uvs[i * 2 + 0] = this._vertices[i * 8 + 6]
            this.uvs[i * 2 + 1] = this._vertices[i * 8 + 7]
            
            if(!this.normals) continue
            const nx = this._vertices[i * 8 + 3]
            const ny = this._vertices[i * 8 + 4]
            const nz = this._vertices[i * 8 + 5]
            this.normals[i * 3 + 0] = normalMatrix[0] * nx + normalMatrix[3] * ny + normalMatrix[6] * nz
            this.normals[i * 3 + 1] = normalMatrix[1] * nx + normalMatrix[4] * ny + normalMatrix[7] * nz
            this.normals[i * 3 + 2] = normalMatrix[2] * nx + normalMatrix[5] * ny + normalMatrix[8] * nz
            const length = Math.hypot(this.normals[i * 3 + 0], this.normals[i * 3 + 1], this.normals[i * 3 + 2])
            const invLength = length && 1 / length
            this.normals[i * 3 + 0] *= invLength
            this.normals[i * 3 + 1] *= invLength
            this.normals[i * 3 + 2] *= invLength
        }

        this.bounds.update(this.transform, this.boundingRadius)
    }
}