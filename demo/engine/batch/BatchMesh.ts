import { ICamera } from '../Camera'
import { mat4, vec2, vec3, vec4 } from '../math'
import { SpriteMaterial } from '../Sprite'
import { Transform } from '../Transform'
import { IBatched } from './GeometryBatch'
import { IVertexAttribute } from '../webgl'
import { BoundingVolume, calculateBoundingRadius } from '../FrustumCulling'

export class BatchMesh implements IBatched {
    public index: number = -1
    public frame: number = 0
    public order: number = 0
    public readonly _vertices: Float32Array
    public readonly vertices: Float32Array
    public readonly uvs: Float32Array
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
    }, double?: boolean){
        if(double){
            this.indices = new Uint16Array(geometry.indexArray.length * 2)
            for(let i = geometry.indexArray.length / 3 - 1; i >= 0; i--){
                this.indices[i*3+0] = geometry.indexArray[i*3+2]
                this.indices[i*3+1] = geometry.indexArray[i*3+1]
                this.indices[i*3+2] = geometry.indexArray[i*3+0]
            }
            this.indices.set(geometry.indexArray, geometry.indexArray.length)
        }else this.indices = geometry.indexArray
        this._vertices = geometry.vertexArray
        const length = geometry.vertexArray.byteLength / geometry.format[1].stride
        this.vertices = new Float32Array(length * 3)
        this.uvs = new Float32Array(length * 2)
        this.boundingRadius = calculateBoundingRadius(
            geometry.vertexArray,
            geometry.format[1].stride / Float32Array.BYTES_PER_ELEMENT,
            geometry.format[1].offset / Float32Array.BYTES_PER_ELEMENT
        )
    }

    public recalculate(frame: number, camera: ICamera){
        if(this.frame > 0 && this.frame >= this.transform.frame) return
        this.frame = frame

        const length = this.vertices.length / 3
        const matrix = this.transform.matrix
        for(let i = length - 1; i >= 0; i--){
            const x = this._vertices[i * 8 + 0]
            const y = this._vertices[i * 8 + 1]
            const z = this._vertices[i * 8 + 2]
            this.vertices[i * 3 + 0] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]
            this.vertices[i * 3 + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]
            this.vertices[i * 3 + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]

            this.uvs[i * 2 + 0] = this._vertices[i * 8 + 6]
            this.uvs[i * 2 + 1] = this._vertices[i * 8 + 7]
        }

        this.bounds.update(this.transform, this.boundingRadius)
    }
}