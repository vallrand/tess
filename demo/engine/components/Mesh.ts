import { vec3, quat, mat4, aabb3, vec4, mat3 } from '../math'
import { Application, ISystem, ILoadedData, Factory } from '../framework'
import { GL, IVertexAttribute, UniformBlock, UniformBlockBindings, OpaqueLayer } from '../webgl'
import { Transform, BoundingVolume, calculateBoundingRadius } from '../scene'
import { MaterialSystem, MeshMaterial } from '../materials'
import { IMesh, IMaterial, DeferredGeometryPass } from '../pipeline'
import { createPlane, IGeometry } from '../geometry'
import { IKRig } from './InverseKinematics'

interface IBufferRange {
    buffer: number
    byteOffset: number
    byteLength: number
}

export interface IModelData {
    name: string
    texture: number
    format: number
    inverseBindPose?: IBufferRange
    armature?: {
        name: string
        parent: number
        position?: vec3
        rotation?: quat
        scale?: vec3
    }[]
    vertices: IBufferRange
    indices: IBufferRange

}

export interface MeshBuffer {
    frame: number
    readonly format: IVertexAttribute[]
    readonly vao: WebGLVertexArrayObject
    readonly vbo: WebGLBuffer
    readonly ibo?: WebGLBuffer
    readonly indexOffset: number
    indexCount: number
    readonly drawMode: number

    readonly aabb: aabb3
    radius: number
}

export interface ArmatureNode {
    parent: number
    position: vec3
    rotation: quat
    scale: vec3
    globalTransform: mat4
    transform: Float32Array
}

export class Armature {
    private static readonly tempMat4: mat4 = mat4()
    public frame: number = 0
    public boneMatrix: Float32Array
    public ik: IKRig
    constructor(
        public readonly inverseBindPose: mat4[],
        public readonly key: string,
        nodes: {
            name: string
            parent: number
            position?: vec3
            rotation?: quat
            scale?: vec3
        }[]
    ){
        const matrixSize = 12
        this.boneMatrix = new Float32Array(nodes.length * matrixSize)
        this.nodes = nodes.map(({ position, rotation, scale, parent }, index) => ({
            parent,
            position: vec3.copy(position || vec3.ZERO, vec3()),
            rotation: quat.copy(rotation || quat.IDENTITY, quat()),
            scale: vec3.copy(scale || vec3.ONE, vec3()),
            globalTransform: mat4(),
            transform: new Float32Array(this.boneMatrix.buffer, index * matrixSize * Float32Array.BYTES_PER_ELEMENT, matrixSize)
        }))
    }
    public nodes: ArmatureNode[]
    public update(context: Application): void {
        if(this.frame) return
        this.frame = context.frame
        for(let j = 0; j < this.nodes.length; j++){
            const node = this.nodes[j]
            quat.normalize(node.rotation, node.rotation)
            mat4.fromRotationTranslationScale(node.rotation, node.position, node.scale, node.globalTransform)
            if(node.parent != -1) mat4.multiply(this.nodes[node.parent].globalTransform, node.globalTransform, node.globalTransform)
            mat4.multiply(node.globalTransform, this.inverseBindPose[j], Armature.tempMat4)
            mat4.transpose(Armature.tempMat4, node.transform as any)
        }
    }
    public updateBone(index: number){
        const node = this.nodes[index]
        mat4.multiply(node.globalTransform, this.inverseBindPose[index], Armature.tempMat4)
        mat4.transpose(Armature.tempMat4, node.transform as any)
    }
}

export class Mesh implements IMesh {
    public index: number = -1
    public frame: number = 0
    public order: number = 0
    public layer: OpaqueLayer = 0
    public startTime: number = 0
    public transform: Transform
    public material: IMaterial
    public buffer: MeshBuffer
    public armature: Armature
    public uniform: UniformBlock
    public readonly bounds = new BoundingVolume
    public readonly color: vec4 = vec4(1,1,1,1)
    public update(context: Application){
        if(this.frame && this.frame >= this.transform.frame) return
        this.frame = context.frame
        if(!this.uniform) this.uniform = new UniformBlock(context.gl, { byteSize: 4*(16+4+2) }, UniformBlockBindings.ModelUniforms)
        this.bounds.update(this.transform.matrix, this.buffer.radius, this.transform.frame)
        this.uniform.data.set(this.transform.matrix, 0)
        this.uniform.data.set(this.color, 16)
        this.uniform.data[20] = this.layer
        this.uniform.data[21] = this.startTime
    }
}

export class MeshSystem implements ISystem {
    private readonly pool: Mesh[] = []
    public readonly list: Mesh[] = []
    public readonly models: Record<string, {
        buffer: MeshBuffer
        inverseBindPose?: mat4[]
        model: IModelData
        material?: MeshMaterial
        geometry: IGeometry
    }> = Object.create(null)
    public readonly plane: MeshBuffer
    constructor(private readonly context: Application){
        const plane = createPlane({ width: 2, height: -2, columns: 1, rows: 1 })
        this.plane = this.uploadVertexData(plane.vertexArray, plane.indexArray, plane.format)
    }
    public create(): Mesh {
        const item = this.pool.pop() || new Mesh()
        item.index = this.list.push(item) - 1
        return item
    }
    public delete(item: Mesh): void {
        if(item.index == -1) return
        this.list[item.index] = this.list[this.list.length - 1]
        this.list[item.index].index = item.index
        this.list.length--
        item.index = -1
        this.pool.push(item)

        item.frame = item.layer = item.order = 0
        item.armature = item.material = item.buffer = item.transform = null
        vec4.copy(vec4.ONE, item.color)
    }
    public unloadVertexData(buffer: MeshBuffer): void {
        this.context.gl.deleteBuffer(buffer.vbo)
        this.context.gl.deleteBuffer(buffer.ibo)
        this.context.gl.deleteVertexArray(buffer.vao)
    }
    public updateVertexData(buffer: MeshBuffer, vertexArray: Float32Array): void {
        const { gl } = this.context
        buffer.frame = this.context.frame
        gl.bindBuffer(GL.ARRAY_BUFFER, buffer.vbo)
        gl.bufferSubData(GL.ARRAY_BUFFER, 0, vertexArray, 0, vertexArray.length)

        aabb3.calculate(vertexArray, buffer.format[1].stride, buffer.format[1].offset, buffer.aabb),
        buffer.radius = calculateBoundingRadius(vertexArray, buffer.format[1].stride, buffer.format[1].offset)
    }
    public uploadVertexData(vertexArray: Float32Array, indexArray: Uint16Array, format: IVertexAttribute[], dynamic?: boolean): MeshBuffer {
        const gl: WebGL2RenderingContext = this.context.gl

        const vao = gl.createVertexArray()
        gl.bindVertexArray(vao)

        const vertexBuffer = gl.createBuffer()
        gl.bindBuffer(GL.ARRAY_BUFFER, vertexBuffer)
        gl.bufferData(GL.ARRAY_BUFFER, vertexArray, dynamic ? GL.DYNAMIC_DRAW : GL.STATIC_DRAW)

        for(let index = 1; index < format.length; index++){
            const { size, type, normalized, stride, offset } = format[index]
            gl.enableVertexAttribArray(index - 1)
            gl.vertexAttribPointer(index - 1, size, type, normalized, stride, offset)
            if(format[index].divisor) gl.vertexAttribDivisor(index - 1, format[index].divisor)
        }

        const indexBuffer = gl.createBuffer()
        gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, indexBuffer)
        gl.bufferData(GL.ELEMENT_ARRAY_BUFFER, indexArray, GL.STATIC_DRAW)

        gl.bindVertexArray(null)

        return {
            vbo: vertexBuffer, ibo: indexBuffer, frame: this.context.frame,
            vao, indexCount: indexArray.length, indexOffset: 0, format, drawMode: GL.TRIANGLES,
            aabb: aabb3.calculate(vertexArray, format[1].stride, format[1].offset, aabb3()),
            radius: calculateBoundingRadius(vertexArray, format[1].stride, format[1].offset)
        }
    }
    public update(){
        for(let i = this.list.length - 1; i >= 0; i--){
            if(this.list[i].color[3] == 0) continue
            if(i > 0 && this.list[i-1].order > this.list[i].order){
                const temp = this.list[i]
                this.list[i] = this.list[i-1]
                this.list[i-1] = temp
                this.list[i].index = i
                this.list[i-1].index = i-1
            }
            const mesh = this.list[i]
            mesh.update(this.context)
            mesh.armature?.update(this.context)
            mesh.armature?.ik?.update()
        }
    }
    public load(manifest: { format: IVertexAttribute[][], buffer: string[], model: IModelData[] }, data: ILoadedData): void {
        const arraybuffer = data.buffers[0]
        for(let i = 0; i < manifest.model.length; i++){
            const model = manifest.model[i]
            const vertexArray = new Float32Array(arraybuffer, model.vertices.byteOffset, model.vertices.byteLength / Float32Array.BYTES_PER_ELEMENT)
            const indexArray = new Uint16Array(arraybuffer, model.indices.byteOffset, model.indices.byteLength / Uint16Array.BYTES_PER_ELEMENT)
            const format = manifest.format[model.format]
            
            this.models[model.name] = { buffer: null, model, geometry: { format, vertexArray, indexArray } }
            if(model.inverseBindPose)
                this.models[model.name].inverseBindPose = model.armature.map((node, index) => new Float32Array(
                    arraybuffer,
                    model.inverseBindPose.byteOffset + index * 16 * Float32Array.BYTES_PER_ELEMENT, 16
                )) as any

            if(model.texture != -1){
                const material = this.models[model.name].material = new MeshMaterial()
                material.program = this.context.get(DeferredGeometryPass).programs[model.armature ? 1 : 2]
                material.diffuse = this.context.get(MaterialSystem).materials[model.texture].diffuse
                material.normal = this.context.get(MaterialSystem).materials[model.texture].normal
                material.index = this.context.get(MaterialSystem).materials[model.texture].index
            }
        }
    }
    public loadModel(key: string): Mesh {
        if(!this.models[key].buffer){
            const geometry = this.models[key].geometry
            this.models[key].buffer = this.uploadVertexData(geometry.vertexArray, geometry.indexArray, geometry.format)
        }
        const mesh = this.create()
        const { model, inverseBindPose, buffer, material } = this.models[key]
        mesh.layer = model.armature ? OpaqueLayer.Skinned : OpaqueLayer.Static
        mesh.buffer = buffer
        mesh.material = material
        if(model.armature) mesh.armature = new Armature(inverseBindPose, model.name, model.armature)
        mesh.order = model.armature ? 1 : 2
        return mesh
    }
}