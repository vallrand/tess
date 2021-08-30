import { Application } from '../framework'
import { vec3, vec4 } from '../math'
import { GL, ShaderProgram, VertexDataFormat } from '../webgl'
import { VertexDataBatch } from './VertexDataBatch'
import { ICamera } from '../scene/Camera'
import { BoundingVolume } from '../scene/FrustumCulling'
import { IMaterial } from '../Material'
import { IMesh } from '../pipeline'


export const uint8x4 = (r: number, g: number, b: number, a: number): number =>
(0xFF & r) | (0xFF00 & g << 8) | (0xFF0000 & b << 16) | (0xFF000000 & a << 24)
export const uint16x2 = (u: number, v: number): number => 
(0xFFFF0000 & v << 16) | 0xFFFF & u

export const uintNorm4x8 = (r: number, g: number, b: number, a: number): number =>
(0xFF * r) | (0xFF * g << 8) | (0xFF * b << 16) | (0xFF * a << 24)
export const uintNorm2x16 = (u: number, v: number): number => 
(0xFFFF * v << 16) | 0xFFFF & (0xFFFF * u | 0)

export interface IBatchMaterial extends IMaterial {
    diffuse: WebGLTexture
    domain: vec3
}

export interface IBatched extends IMesh {
    frame: number
    index?: number
    vertices: Float32Array
    uvs: Float32Array
    indices: Uint16Array
    color: vec4
    colors?: Uint32Array
    material: IBatchMaterial
}

export class GeometryBatch extends VertexDataBatch<IBatched> {
    public static quadIndices = [0,1,2,0,2,3]
    public readonly textures: WebGLTexture[] = []
    private readonly maxTextures: number
    constructor(gl: WebGL2RenderingContext, maxVertices: number, maxIndices: number, fixedIndices?: number[]){
        super(gl, VertexDataFormat.Batched, maxVertices, maxIndices, fixedIndices)
        this.maxTextures = gl.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS)
    }
    render(geometry: IBatched): boolean {
        const { vertices, uvs, indices, colors, material } = geometry
        const indexCount = indices.length, vertexCount = vertices.length >>> 1
        if(this.indexOffset == 0) this.textures.length = 0
        let textureIndex = this.textures.indexOf(material.diffuse)

        if(
            (textureIndex == -1 && this.textures.length >= this.maxTextures) ||
            (this.indexOffset + indexCount > this.maxIndices) ||
            (this.vertexOffset + vertexCount > this.maxVertices)
        ) return false

        const color = uintNorm4x8(geometry.color[0], geometry.color[1], geometry.color[2], geometry.color[3])
        if(!color) return true
        if(textureIndex == -1) textureIndex = this.textures.push(material.diffuse) - 1
        const material4 = uint8x4(material.domain[0], material.domain[1], material.domain[2], textureIndex)
        
        if(!this.fixedIndices) for(let i = 0; i < indexCount; i++)
            this.indexArray[this.indexOffset + i] = indices[i] + this.vertexOffset
        this.indexOffset += indexCount

        const stride = this.format[1].stride >>> 2
        const offset = this.vertexOffset * stride
        for(let i = 0, index = offset; i < vertexCount; i++, index += stride){
            this.float32View[index + 0] = vertices[3*i+0]
            this.float32View[index + 1] = vertices[3*i+1]
            this.float32View[index + 2] = vertices[3*i+2]
            this.uint32View[index + 3] = uintNorm2x16(uvs[2*i], uvs[2*i+1])
            this.uint32View[index + 4] = colors ? colors[i] : color
            this.uint32View[index + 5] = material4
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