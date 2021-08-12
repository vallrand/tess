import { vec4 } from '../math'
import { GL, VertexDataFormat } from '../webgl'
import { VertexDataBatch } from './VertexDataBatch'

export const uint8x4 = (r: number, g: number, b: number, a: number): number =>
(0xFF * r) | (0xFF * g << 8) | (0xFF * b << 16) | (0xFF * a << 24)
export const uint16x2 = (u: number, v: number): number => 
(0xFFFF * v << 16) | 0xFFFF & (0xFFFF * u | 0)

export interface IBatched2D {
    vertices: Float32Array
    uvs: Float32Array
    indices: Uint16Array
    color: vec4
    colors?: Uint32Array
    material: { texture: WebGLTexture }
}
export class Batch2D extends VertexDataBatch {
    public static quadIndices = [0,1,2,0,2,3]
    public readonly textures: WebGLTexture[] = []
    private readonly maxTextures: number
    constructor(gl: WebGL2RenderingContext, maxVertices: number, maxIndices: number, fixedIndices: number[]){
        super(gl, VertexDataFormat.Batched2D, maxVertices, maxIndices, fixedIndices)
        this.maxTextures = gl.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS)
    }
    render(geometry: IBatched2D): boolean {
        const { vertices, uvs, indices, colors, material } = geometry
        const indexCount = indices.length, vertexCount = vertices.length >>> 1
        if(this.indexOffset == 0) this.textures.length = 0
        let textureIndex = this.textures.indexOf(material.texture)

        if(
            (textureIndex == -1 && this.textures.length >= this.maxTextures) ||
            (this.indexOffset + indexCount > this.maxIndices) ||
            (this.vertexOffset + vertexCount > this.maxVertices)
        ) return false

        if(textureIndex == -1) textureIndex = this.textures.push(material.texture) - 1
        const color = uint8x4(geometry.color[0], geometry.color[1], geometry.color[2], geometry.color[3])
        const material4 = textureIndex << 24
        
        if(!this.fixedIndices) for(let i = 0; i < indexCount; i++)
            this.indexArray[this.indexOffset + i] = indices[i] + this.vertexOffset
        this.indexOffset += indexCount

        const stride = this.format[1].stride >>> 2
        const offset = this.vertexOffset * stride
        for(let i = 0, index = offset; i < vertexCount; i++, index += stride){
            this.float32View[index + 0] = vertices[2*i+0]
            this.float32View[index + 1] = vertices[2*i+1]
            this.uint32View[index + 2] = uint16x2(uvs[2*i], uvs[2*i+1])
            this.uint32View[index + 3] = colors ? colors[i] : color
            this.uint32View[index + 4] = material4
        }
        this.vertexOffset += vertexCount
        return true
    }
    bind(){
        super.bind()
        this.bindTextures(this.textures)
    }
    bindTextures(textures: WebGLTexture[]){
        const gl = this.gl
        for(let i = 0; i < textures.length; i++){
            gl.activeTexture(GL.TEXTURE0 + i)
            gl.bindTexture(GL.TEXTURE_2D, textures[i])
        }
    }
}