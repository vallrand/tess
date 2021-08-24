import { Application } from '../framework'
import { IEffect } from '../pipeline'
import { GL, ShaderProgram, IVertexAttribute, UniformSamplerBindings, UniformBlockBindings } from '../webgl'
import { MeshBuffer } from '../Mesh'
import { ParticleEmitter } from './ParticleEmitter'

export interface ParticleSystemOptions {
    limit: number
    format: IVertexAttribute[]
    depthTest: number
    depthWrite: boolean
    cull: number
    blend: number
}

export class ParticleSystem<T> implements IEffect {
    private readonly pool: ParticleEmitter[] = []
    public enabled: boolean = true
    protected index: number = 0
    public instances: number = 0
    private tfbWrite: WebGLTransformFeedback[] = []
    private tfbRead: WebGLVertexArrayObject[] = []
    private vao: WebGLVertexArrayObject[] = []
    protected buffer: WebGLBuffer[] = []

    public diffuse: WebGLTexture
    public gradientRamp: WebGLTexture
    public curveSampler: WebGLTexture

    public readonly emitters: ParticleEmitter[] = []
    constructor(
        protected context: Application,
        private readonly options: ParticleSystemOptions,
        private readonly mesh?: MeshBuffer,
        protected readonly program?: ShaderProgram,
        protected readonly transform?: ShaderProgram
    ){
        const { gl } = this.context
        for(let i = 0; i < 2; i++){
            this.buffer[i] = gl.createBuffer()
            gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer[i])
            gl.bufferData(GL.ARRAY_BUFFER, options.limit * options.format[0].stride, transform ? GL.STREAM_COPY : GL.DYNAMIC_DRAW)

            if(transform){
                this.tfbWrite[i] = gl.createTransformFeedback()
                gl.bindTransformFeedback(GL.TRANSFORM_FEEDBACK, this.tfbWrite[i])
                gl.bindBufferBase(GL.TRANSFORM_FEEDBACK_BUFFER, 0, this.buffer[i])
                gl.bindTransformFeedback(GL.TRANSFORM_FEEDBACK, null)
            }
            if(transform && mesh){
                this.tfbRead[i] = gl.createVertexArray()
                gl.bindVertexArray(this.tfbRead[i])
                gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer[i])
                for(let i = 0; i < options.format.length; i++){
                    const { size, type, normalized, stride, offset } = options.format[i]
                    gl.enableVertexAttribArray(i)
                    gl.vertexAttribPointer(i, size, type, normalized, stride, offset)
                }
                gl.bindVertexArray(null)
            }
            if(this.program){
                let location = 0
                this.vao[i] = gl.createVertexArray()
                gl.bindVertexArray(this.vao[i])
                gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer[i])
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
            }
            if(!transform) break
        }
    }
    public apply(): void {
        if(!this.enabled) return
        if(this.transform) for(let i = this.instances = 0; i < this.emitters.length; i++)
            this.instances += this.emitters[i].update(this.context, this.instances, this.options)
        if(!this.instances) return

        const { gl } = this.context
        gl.enable(GL.BLEND)
        if(this.options.blend == 1)
            gl.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE)
        else if(this.options.blend == 2)
            gl.blendFunc(GL.ONE, GL.ONE)
        else gl.blendFuncSeparate(GL.ONE, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE)

        if(this.options.depthTest) gl.enable(GL.DEPTH_TEST)
        else gl.disable(GL.DEPTH_TEST)

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(GL.TEXTURE_2D, this.diffuse)
        gl.activeTexture(gl.TEXTURE0 + UniformSamplerBindings.uGradient)
        gl.bindTexture(GL.TEXTURE_2D, this.gradientRamp)
        gl.activeTexture(gl.TEXTURE0 + UniformSamplerBindings.uAttributes)
        gl.bindTexture(GL.TEXTURE_2D, this.curveSampler)

        transform: {
            if(!this.transform || !this.emitters.length) break transform
            gl.useProgram(this.transform.target)
            gl.bindVertexArray(this.tfbRead[this.index])
            gl.bindTransformFeedback(GL.TRANSFORM_FEEDBACK, this.tfbWrite[this.index ^= 1])
            if(this.mesh) gl.enable(GL.RASTERIZER_DISCARD)
            gl.beginTransformFeedback(GL.POINTS)

            for(let i = 0; i < this.emitters.length; i++){
                const emitter = this.emitters[i]
                if(!emitter.range[1]) continue
                emitter.uniform.bind(gl, UniformBlockBindings.EmitterUniforms)
                gl.drawArrays(GL.POINTS, emitter.range[0], emitter.range[1])
            }

            gl.endTransformFeedback()
            if(this.mesh) gl.disable(GL.RASTERIZER_DISCARD)
            gl.bindTransformFeedback(GL.TRANSFORM_FEEDBACK, null)
        }
        render: {
            if(!this.program) break render
            gl.useProgram(this.program.target)
            gl.bindVertexArray(this.vao[this.index])
            if(!this.mesh) gl.drawArrays(GL.POINTS, 0, this.instances)
            else if(this.mesh.ibo) gl.drawElementsInstanced(this.mesh.drawMode, this.mesh.indexCount, GL.UNSIGNED_SHORT, this.mesh.indexOffset, this.instances)
            else gl.drawArraysInstanced(this.mesh.drawMode, this.mesh.indexOffset, this.mesh.indexCount, this.instances)
        }
    }
    public add(options: T): ParticleEmitter {
        const emitter = this.pool.pop() || new ParticleEmitter(this.context.gl, this.transform)
        for(let key in options)
            emitter.uniform.uniforms[key].set(options[key] as any, 0)
        this.emitters.push(emitter)
        return emitter
    }
    public remove(emitter: ParticleEmitter): void {
        const index = this.emitters.indexOf(emitter)
        if(!~index) return
        this.emitters.splice(index, 1)
        this.pool.push(emitter)
    }
}