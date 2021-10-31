import { Application } from '../../framework'
import { vec2, vec3, vec4, quat, mat4, aabb3 } from '../../math'
import { MeshBuffer } from '../../components/Mesh'
import { GL, VertexDataFormat, GLSLDataType, IVertexAttribute } from '../../webgl'
import { VertexDataBatch } from './VertexDataBatch'
import { uintNorm2x16, intNorm4x8 } from './common'

export interface IModelInstance {
    format: IVertexAttribute[]
    vertices: Float32Array
    indices: Uint16Array
    transform: mat4
}

class AttributeView<T> {
    static MAX = {
        [GL.UNSIGNED_SHORT]: 0xFFFF,
        [GL.SHORT]: 0x7FFF,
        [GL.UNSIGNED_BYTE]: 0xFF,
        [GL.BYTE]: 0x7F
    }
    view: typeof GLSLDataType[keyof typeof GLSLDataType]
    stride: number
    offset: number
    factor: number
    value: Float32Array & T
    public load(attribute: IVertexAttribute, vertices: Float32Array): void {
        const DataType = GLSLDataType[attribute.type]
        this.view = new DataType(vertices.buffer, vertices.byteOffset, vertices.byteLength / DataType.BYTES_PER_ELEMENT)
        this.stride = attribute.stride / DataType.BYTES_PER_ELEMENT
        this.offset = attribute.offset / DataType.BYTES_PER_ELEMENT
        this.factor = attribute.normalized ? 1 / AttributeView.MAX[attribute.type] : 1
        this.value = new Float32Array(attribute.size) as any
    }
    public get(index: number): T {
        const i = index * this.stride + this.offset
        for(let j = 0; j < this.value.length; j++) this.value[j] = this.factor * this.view[i + j]
        return this.value
    }
}

export class ModelBatch extends VertexDataBatch<IModelInstance> {
    public readonly buffer: MeshBuffer
    private readonly attributes = {
        position: new AttributeView<vec3>(),
        normal: new AttributeView<vec3>(),
        uv: new AttributeView<vec2>()
    }
    constructor(private readonly context: Application, maxVertices: number, maxIndices: number){
        super(context.gl, VertexDataFormat.Static, maxVertices, maxIndices)
        this.buffer = {
            vbo: this.vertexBuffer, ibo: this.indexBuffer, vao: this.vao,
            frame: 0, indexOffset: 0, drawMode: GL.TRIANGLES, format: this.format,
            indexCount: 0, aabb: aabb3(), radius: 0
        }
    }
    public render(model: IModelInstance): boolean {
        const { vertices, indices, format } = model
        const indexCount = indices.length
        const vertexCount = vertices.length * vertices.BYTES_PER_ELEMENT / format[1].stride

        if(
            this.indexOffset + indexCount > this.maxIndices ||
            this.vertexOffset + vertexCount > this.maxVertices
        ) return false
        else if(this.indexOffset == 0){
            aabb3.copy(aabb3.INFINITE, this.buffer.aabb)
            this.buffer.radius = 0
        }

        for(let i = 0; i < indexCount; i++) this.indexArray[this.indexOffset++] = indices[i] + this.vertexOffset
        const stride = this.format[1].stride >>> 2
        for(let i = 1; i < format.length; i++)
            this.attributes[format[i].name]?.load(format[i], vertices)
        const { position, normal, uv } = this.attributes

        for(let i = 0, index = this.vertexOffset * stride; i < vertexCount; i++, index += stride){
            const _position = position.get(i)
            const _normal = normal.get(i)
            const _uv = uv.get(i)

            mat4.transform(_position, model.transform, _position)
            mat4.transformNormal(_normal, model.transform, _normal)

            this.buffer.radius = Math.max(this.buffer.radius, Math.hypot(_position[0], _position[1], _position[2]))
            aabb3.insert(this.buffer.aabb, _position, this.buffer.aabb)

            this.float32View[index + 0] = _position[0]
            this.float32View[index + 1] = _position[1]
            this.float32View[index + 2] = _position[2]
            this.float32View[index + 3] = _normal[0]
            this.float32View[index + 4] = _normal[1]
            this.float32View[index + 5] = _normal[2]
            this.float32View[index + 6] = _uv[0]
            this.float32View[index + 7] = _uv[1]
        }
        this.vertexOffset += vertexCount
        this.buffer.indexCount = this.indexOffset
        return true
    }
}