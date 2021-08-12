import { vec3, quat, mat4, aabb3 } from './math'
import { GL, IVertexAttribute } from './webgl'
import { Application, IProgressHandler, loadFile, System, Factory } from './framework'

import { Transform } from './Transform'
import { MaterialSystem, Material } from './Material'
import { BoundingVolume } from './FrustumCulling'

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
    readonly indexCount: number
    readonly indexOffset: number
    readonly drawMode: number

    readonly aabb: aabb3
    radius: number
}

export class Armature {
    public frame: number = 0
    public boneMatrix: Float32Array
    constructor(public readonly inverseBindPose: mat4[], nodes: {
        name: string
        parent: number
        position?: vec3
        rotation?: quat
        scale?: vec3
    }[]){
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
    public nodes: {
        parent: number
        position: vec3
        rotation: quat
        scale: vec3
        globalTransform: mat4
        transform: Float32Array
    }[]
}

export class Mesh {
    public index: number = -1
    public frame: number = 0
    public program: number = 0
    public layer: number = 0
    public transform: Transform
    public material: Material
    public buffer: MeshBuffer
    public armature: Armature
    public readonly bounds = new BoundingVolume
}

export class MeshSystem extends Factory<Mesh> implements System {
    private static readonly tempMat4: mat4 = mat4()
    public readonly models: Record<string, {
        buffer: MeshBuffer
        inverseBindPose?: mat4[]
        model: IModelData
    }> = Object.create(null)
    constructor(private readonly context: Application){super(Mesh)}
    public delete(mesh: Mesh): void {
        super.delete(mesh)
        mesh.frame = mesh.program = mesh.layer = 0
        mesh.armature = mesh.material = mesh.buffer = mesh.transform = null
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
            if(this.list[i].program == -1) continue
            if(i > 0 && this.list[i-1].program > this.list[i].program){
                const temp = this.list[i]
                this.list[i] = this.list[i-1]
                this.list[i-1] = temp
                this.list[i].index = i
                this.list[i-1].index = i-1
            }
            const mesh = this.list[i]
            if(!(mesh.frame && mesh.frame >= mesh.transform.frame)){
                mesh.bounds.update(mesh.transform, mesh.buffer.radius)
                mesh.frame = this.context.frame
            }
            if(!mesh.armature || mesh.armature.frame > 0) continue
            this.updateArmature(mesh.armature)
        }
    }
    private updateArmature(armature: Armature): void {
        armature.frame = this.context.frame
        for(let j = 0; j < armature.nodes.length; j++){
            const node = armature.nodes[j]
            quat.normalize(node.rotation, node.rotation)
            mat4.fromRotationTranslationScale(node.rotation, node.position, node.scale, node.globalTransform)
            if(node.parent != -1) mat4.multiply(armature.nodes[node.parent].globalTransform, node.globalTransform, node.globalTransform)
            mat4.multiply(node.globalTransform, armature.inverseBindPose[j], MeshSystem.tempMat4)
            mat4.transpose(MeshSystem.tempMat4, node.transform as any)
        }
    }
    public load(manifest: { format: IVertexAttribute[][], buffer: string[], model: IModelData[] }, progress: IProgressHandler<void>): void {
        loadFile<ArrayBuffer>(manifest.buffer[0], 'arraybuffer', (remaining, value) => {
            if(remaining == -1) return progress(remaining, value as Error)
            if(remaining != 0) return progress(remaining)
            
            const arraybuffer = value as ArrayBuffer
            for(let i = 0; i < manifest.model.length; i++){
                const model = manifest.model[i]
                const vertices = new Float32Array(arraybuffer, model.vertices.byteOffset, model.vertices.byteLength / Float32Array.BYTES_PER_ELEMENT)
                const indices = new Uint16Array(arraybuffer, model.indices.byteOffset, model.indices.byteLength / Uint16Array.BYTES_PER_ELEMENT)
                const format = manifest.format[model.format]
                const buffer = this.uploadVertexData(vertices, indices, format)
                
                this.models[model.name] = { buffer, model }
                if(model.inverseBindPose)
                    this.models[model.name].inverseBindPose = model.armature.map((node, index) => new Float32Array(
                        arraybuffer,
                        model.inverseBindPose.byteOffset + index * 16 * Float32Array.BYTES_PER_ELEMENT, 16
                    )) as any
            }
            progress(remaining)
        })
    }
    public loadModel(name: string): Mesh {
        const { model, inverseBindPose, buffer } = this.models[name]
        const armature = new Armature(inverseBindPose, model.armature)
        
        const mesh = this.create()
        mesh.program = mesh.layer = 1
        mesh.buffer = buffer
        mesh.armature = armature
        mesh.material = this.context.get(MaterialSystem).materials[model.texture]
        return mesh
    }
}

function calculateBoundingRadius(vertices: Float32Array, stride: number, offset: number): number {
    let squareRadius = 0
    for(let i = 0; i < vertices.length; i+=stride){
        const x = vertices[i + offset + 0], y = vertices[i + offset + 1], z = vertices[i + offset + 2]
        squareRadius = Math.max(squareRadius, x*x+y*y+z*z)
    }
    return Math.sqrt(squareRadius)
}