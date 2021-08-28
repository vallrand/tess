import { vec4, mat4, mat3x2, vec2 } from '../math'
import { Transform } from '../Transform'
import { SpriteMaterial } from '../Sprite'
import { GL, GLSLDataType, IVertexAttribute, VertexDataFormat } from '../webgl'
import { uint8x4, uintNorm2x16, uintNorm4x8 } from './GeometryBatch'

export interface IBatchedDecal {
    material: SpriteMaterial
    transform: Transform
    threshold: number
    color: vec4
}
export class DecalBatch {
    public static readonly unitCubeVertices = new Float32Array([
        -0.5,-0.5,-0.5,
        -0.5,-0.5,+0.5,
        -0.5,+0.5,-0.5,
        -0.5,+0.5,+0.5,
        +0.5,-0.5,-0.5,
        +0.5,-0.5,+0.5,
        +0.5,+0.5,-0.5,
        +0.5,+0.5,+0.5
    ])
    public static readonly unitCubeIndices = new Uint16Array([
        1,5,7,1,7,3,
        0,2,6,0,6,4,
        2,3,7,2,7,6,
        0,4,5,0,5,1,
        4,6,7,4,7,5,
        0,1,3,0,3,2
    ])
    public readonly format: IVertexAttribute[] = VertexDataFormat.Decal
    public readonly vao: WebGLVertexArrayObject
    public readonly indexBuffer: WebGLBuffer
    public readonly vertexBuffer: WebGLBuffer
    public readonly instanceBuffer: WebGLBuffer
    public readonly float32View: Float32Array
    public readonly uint32View: Uint32Array
    public instanceOffset: number = 0
    public readonly stride: number
    constructor(private readonly gl: WebGL2RenderingContext, readonly batchSize: number){
        this.vao = gl.createVertexArray()
        gl.bindVertexArray(this.vao)
        this.indexBuffer = gl.createBuffer()
        gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
        gl.bufferData(GL.ELEMENT_ARRAY_BUFFER, DecalBatch.unitCubeIndices, GL.STATIC_DRAW)
        this.vertexBuffer = gl.createBuffer()
        gl.bindBuffer(GL.ARRAY_BUFFER, this.vertexBuffer)
        gl.bufferData(GL.ARRAY_BUFFER, DecalBatch.unitCubeVertices, GL.STATIC_DRAW)

        gl.enableVertexAttribArray(0)
        gl.vertexAttribPointer(0, 3, GL.FLOAT, false, 0, 0)

        this.stride = this.format[0].stride / Float32Array.BYTES_PER_ELEMENT
        this.float32View = new Float32Array(this.stride * batchSize)
        this.uint32View = new Uint32Array(this.float32View.buffer)
        this.instanceBuffer = gl.createBuffer()
        gl.bindBuffer(GL.ARRAY_BUFFER, this.instanceBuffer)
        gl.bufferData(GL.ARRAY_BUFFER, this.float32View.byteLength, GL.DYNAMIC_DRAW)

        let index = 0
        for(let i = 0; i < this.format.length; i++){
            const { size, type, normalized, stride, offset } = this.format[i]
            for(let _offset = offset, _size = size; _size > 0; _size -= 4){
                gl.enableVertexAttribArray(++index)
                gl.vertexAttribPointer(index, Math.min(4, _size), type, normalized, stride, _offset)
                gl.vertexAttribDivisor(index, 1)
                _offset += Math.min(4, _size) * GLSLDataType[type].BYTES_PER_ELEMENT
            }
        }
        gl.bindVertexArray(null)
    }
    render(decal: IBatchedDecal): boolean {
        if(this.instanceOffset + 1 >= this.batchSize) return false
        const color = uintNorm4x8(decal.color[0], decal.color[1], decal.color[2], decal.color[3])
        if(!color) return true

        const matrix = decal.transform?.matrix || mat4.IDENTITY
        const uvMatrix = decal.material?.uvMatrix || mat3x2.IDENTITY
        const indexOffset = this.instanceOffset * this.stride

        this.float32View.set(matrix, indexOffset)
        this.float32View[indexOffset + 3] = decal.threshold
        this.float32View[indexOffset + 7] = 0
        this.float32View[indexOffset + 11] = 0
        this.float32View[indexOffset + 15] = 1
        this.uint32View[indexOffset + 16] = uintNorm2x16(uvMatrix[4], uvMatrix[5])
        this.uint32View[indexOffset + 17] = uintNorm2x16(
            uvMatrix[0] + uvMatrix[2] + uvMatrix[4],
            uvMatrix[1] + uvMatrix[3] + uvMatrix[5]
        )
        this.uint32View[indexOffset + 18] = color
        this.instanceOffset++
        return true
    }
    bind(){
        const gl = this.gl
        gl.bindVertexArray(this.vao)
        if(!this.instanceOffset) return
        gl.bindBuffer(GL.ARRAY_BUFFER, this.instanceBuffer)
        gl.bufferSubData(GL.ARRAY_BUFFER, 0, this.float32View.subarray(0, this.instanceOffset * this.stride))
        this.instanceOffset = 0
    }
    delete(){
        this.gl.deleteBuffer(this.indexBuffer)
        this.gl.deleteBuffer(this.vertexBuffer)
        this.gl.deleteBuffer(this.instanceBuffer)
        this.gl.deleteVertexArray(this.vao)
    }
}