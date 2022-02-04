import { vec3, vec4 } from '../../math'
import { GL, VertexDataFormat } from '../../webgl'
import { VertexDataBatch } from './VertexDataBatch'
import { IMesh, IMaterial } from '../PipelinePass'
import { uint8x4, uint16x2, uintNorm4x8, intNorm4x8, uintNorm2x16 } from './common'

export interface IBatched extends IMesh {
    frame: number
    index?: number
    vertices: Float32Array
    uvs: Float32Array
    normals?: Float32Array
    normal?: vec3
    indices: Uint16Array
    color: vec4
    colors?: Uint32Array
    material: IMaterial & { diffuse: WebGLTexture }
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
        const { vertices, uvs, indices, colors, normals, material } = geometry
        const indexCount = indices.length, vertexCount = vertices.length >>> 1
        if(this.indexOffset == 0) this.textures.length = 0
        let textureIndex = this.textures.indexOf(material.diffuse)

        if(indexCount > this.maxIndices || vertexCount > this.maxVertices)
            throw new Error(`${indexCount}>${this.maxIndices} or ${vertexCount}>${this.maxVertices}`)
        else if(
            (textureIndex == -1 && this.textures.length >= this.maxTextures) ||
            (this.indexOffset + indexCount > this.maxIndices) ||
            (this.vertexOffset + vertexCount > this.maxVertices)
        ) return false

        const color = uintNorm4x8(geometry.color[0], geometry.color[1], geometry.color[2], geometry.color[3])
        if(!color) return true
        if(textureIndex == -1) textureIndex = this.textures.push(material.diffuse) - 1
        const material4 = uint8x4(0,0,0, textureIndex) |
        (geometry.normal ? intNorm4x8(geometry.normal[0], geometry.normal[1], geometry.normal[2], 0) : 0)
        
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
            this.uint32View[index + 5] = normals ? 
            (material4 | intNorm4x8(normals[3*i+0], normals[3*i+1], normals[3*i+2], 0)) : material4
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