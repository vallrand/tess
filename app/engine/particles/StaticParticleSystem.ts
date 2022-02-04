import { Application } from '../framework'
import { GL, IVertexAttribute, ShaderProgram } from '../webgl'
import { MeshBuffer } from '../components'
import { EmitterMaterial } from '../materials'

type IParticleAttributeSampler<Options> =
(this: StaticParticleSystem<Options>, options: Options, offset: number, buffer: Float32Array) => void

export interface StaticParticleEmitter {
    expiry: number
    frame: number
    offset: number
    readonly count: number
    readonly vertexArray: Float32Array
}

export class StaticParticleSystem<Options> {
    public enabled: boolean = true
    public instances: number = 0

    private readonly vao: WebGLVertexArrayObject
    private readonly buffer: WebGLBuffer

    material: EmitterMaterial

    private readonly list: StaticParticleEmitter[] = []
    private readonly samplers: {
        offset: number
        sample: IParticleAttributeSampler<Options>
    }[] = []
    private readonly stride: number

    constructor(
        private readonly context: Application,
        private readonly options: {
            format: IVertexAttribute[]
            limit: number
        },
        private readonly mesh: MeshBuffer,
        private readonly program: ShaderProgram,
        samplers: Record<string, IParticleAttributeSampler<Options>>,
    ){
        const { gl } = this.context
        this.buffer = gl.createBuffer()
        gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer)
        gl.bufferData(GL.ARRAY_BUFFER, options.limit * options.format[0].stride, GL.DYNAMIC_DRAW)

        let location = 0
        this.vao = gl.createVertexArray()
        gl.bindVertexArray(this.vao)
        for(let i = 0; i < options.format.length; i++, location++){
            const { size, type, normalized, stride, offset } = options.format[i]
            gl.enableVertexAttribArray(location)
            gl.vertexAttribPointer(location, size, type, normalized, stride, offset)
            if(this.mesh) gl.vertexAttribDivisor(location, 1)
        }
        if(this.mesh){
            if(this.mesh.ibo) gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.mesh.ibo)
            gl.bindBuffer(GL.ARRAY_BUFFER, this.mesh.vbo)
            for(let i = this.mesh.ibo ? 1 : 0; i < this.mesh.format.length; i++, location++){
                const { size, type, normalized, stride, offset } = this.mesh.format[i]
                gl.enableVertexAttribArray(location)
                gl.vertexAttribPointer(location, size, type, normalized, stride, offset)
            }
        }
        gl.bindVertexArray(null)
        
        this.stride = this.options.format[0].stride / Float32Array.BYTES_PER_ELEMENT

        for(let key in samplers){
            const attribute = this.options.format.find(attribute => attribute.name === key)
            if(!attribute) throw new Error(`${key}!=${this.options.format.map(attribute => attribute.name).join(',')}`)
            const offset = attribute.offset / Float32Array.BYTES_PER_ELEMENT
            this.samplers.push({ offset, sample: samplers[key] })
        }
    }
    private uploadVertexData(): void {
        const { gl } = this.context
        
        this.instances = 0
        let removed = 0
        for(let i = 0; i < this.list.length; i++){
            const emitter = this.list[i]
            if(emitter.expiry > 0 && emitter.expiry <= this.context.currentTime){
                removed++
                continue
            }else if(removed) this.list[i - removed] = emitter

            const offset = this.instances * this.stride * Float32Array.BYTES_PER_ELEMENT
            if(this.instances + emitter.count >= this.options.limit) break
            this.instances += emitter.count

            if(emitter.frame > 0 && emitter.offset === offset) continue
            emitter.frame = this.context.frame
            gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer)
            gl.bufferSubData(GL.ARRAY_BUFFER, emitter.offset = offset, emitter.vertexArray)
        }
        this.list.length -= removed
    }
    public apply(): void {
        if(!this.enabled) return
        const { gl } = this.context

        this.uploadVertexData()
        if(!this.instances) return
        this.material.bind(gl)

        gl.useProgram(this.program.target)
        gl.bindVertexArray(this.vao)
        if(!this.mesh) gl.drawArrays(GL.POINTS, 0, this.instances)
        else if(this.mesh.ibo) gl.drawElementsInstanced(this.mesh.drawMode, this.mesh.indexCount, GL.UNSIGNED_SHORT, this.mesh.indexOffset, this.instances)
        else gl.drawArraysInstanced(this.mesh.drawMode, this.mesh.indexOffset, this.mesh.indexCount, this.instances)
    }
    public start(amount: number, options: Options): StaticParticleEmitter {
        const vertexArray = new Float32Array(this.stride * amount)
        for(let i = 0; i < amount; i++){
            const offset = i * this.stride
            for(let j = this.samplers.length - 1; j >= 0; j--)
                this.samplers[j].sample.call(this, options, offset + this.samplers[j].offset, vertexArray)
        }
        this.list.push({ count: amount, vertexArray, offset: -1, frame: 0, expiry: -1 })
        return this.list[this.list.length - 1]
    }
    public stop(emitter: StaticParticleEmitter): void {
        const { vertexArray, count } = emitter
        let expiry = this.context.currentTime
        for(let i = 0; i < count; i++){
            const offset = i * this.stride
            const startTime = vertexArray[offset + 0]
            const loopDuration = vertexArray[offset + 3]

            const elapsedTime = Math.max(0, this.context.currentTime - startTime) % loopDuration
            const iteration = Math.floor(Math.max(0, this.context.currentTime - startTime) / loopDuration)

            vertexArray[offset + 0] = this.context.currentTime - elapsedTime
            vertexArray[offset + 2] += 0.1*iteration
            vertexArray[offset + 3] = 0
            expiry = Math.max(expiry, this.context.currentTime - elapsedTime + loopDuration)
        }
        emitter.expiry = expiry
        emitter.frame = 0
    }
} 