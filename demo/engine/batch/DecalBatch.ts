import { vec4, mat4 } from '../math'
import { Transform } from '../Transform'
import { SpriteMaterial } from '../Sprite'
import { GL } from '../webgl'
import { uintNorm4x8 } from './GeometryBatch'

export interface IBatchedDecal {
    material: SpriteMaterial
    transform: Transform
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
    public readonly vao: WebGLVertexArrayObject
    public readonly indexBuffer: WebGLBuffer
    public readonly vertexBuffer: WebGLBuffer
    public readonly instanceBuffer: WebGLBuffer
    public readonly instanceArray: Float32Array
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

        this.stride = 16 + 1
        this.instanceArray = new Float32Array(this.stride * batchSize)
        this.instanceBuffer = gl.createBuffer()
        gl.bindBuffer(GL.ARRAY_BUFFER, this.instanceBuffer)
        gl.bufferData(GL.ARRAY_BUFFER, this.instanceArray.byteLength, GL.DYNAMIC_DRAW)

        gl.enableVertexAttribArray(1)
        gl.vertexAttribPointer(1, 4, GL.UNSIGNED_BYTE, true, this.stride*4, 0)

        for(let i = 0; i < 4; i++){
            gl.enableVertexAttribArray(2 + i)
            gl.vertexAttribPointer(2 + i, 4, GL.FLOAT, false, this.stride*4, i * 4 * 4 + 4)
            gl.vertexAttribDivisor(2 + i, 1)
        }

        gl.bindVertexArray(null)
    }
    render(decal: IBatchedDecal): boolean {
        if(this.instanceOffset + 1 >= this.batchSize) return false
        const color = uintNorm4x8(decal.color[0], decal.color[1], decal.color[2], decal.color[3])

        this.instanceArray.set(decal.transform?.matrix || mat4.IDENTITY, this.instanceOffset * this.stride + 1)
        this.instanceOffset++
    }
    bind(){
        const gl = this.gl
        gl.bindVertexArray(this.vao)
        if(!this.instanceOffset) return
        gl.bindBuffer(GL.ARRAY_BUFFER, this.instanceBuffer)
        gl.bufferSubData(GL.ARRAY_BUFFER, 0, this.instanceArray.subarray(0, this.instanceOffset * this.stride))
        this.instanceOffset = 0
    }
    delete(){
        this.gl.deleteBuffer(this.indexBuffer)
        this.gl.deleteBuffer(this.vertexBuffer)
        this.gl.deleteBuffer(this.instanceBuffer)
        this.gl.deleteVertexArray(this.vao)
    }
}