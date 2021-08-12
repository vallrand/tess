import { Application } from '../framework'
import { GL, ShaderProgram, IVertexAttribute, ImageData, UniformBlock, UniformBlockBindings } from '../webgl'
import { MeshBuffer } from '../Mesh'

class ParticleEmitter {
    public uniform: UniformBlock
}

export class ParticleSystem {
    protected index: number = 0
    protected instances: number = 0
    private transformRead: WebGLVertexArrayObject[] = []
    private transformWrite: WebGLTransformFeedback[] = []
    private vao: WebGLVertexArrayObject[] = []
    private buffer: WebGLBuffer[] = []
    public readonly emitters: ParticleEmitter[] = []
    constructor(
        protected readonly context: Application,
        private readonly mesh: MeshBuffer,
        protected readonly program: ShaderProgram,
        private readonly format: IVertexAttribute[],
        private readonly limit: number,
        protected readonly transform: ShaderProgram
    ){
        const { gl } = this.context
        for(let i = 0; i < 2; i++){
            this.buffer[i] = gl.createBuffer()
            gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer[i])
            gl.bufferData(GL.ARRAY_BUFFER, limit * format[0].stride, GL.STREAM_COPY)

            this.transformRead[i] = gl.createVertexArray()
            gl.bindVertexArray(this.transformRead[i])
            gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer[i])
            for(let i = 0; i < format.length; i++){
                gl.enableVertexAttribArray(i)
                gl.vertexAttribPointer(i, format[i].size, format[i].type, format[i].normalized, format[i].stride, format[i].offset)
            }
            this.transformWrite[i] = gl.createTransformFeedback()
            gl.bindTransformFeedback(GL.TRANSFORM_FEEDBACK, this.transformWrite[i])
            gl.bindBufferBase(GL.TRANSFORM_FEEDBACK_BUFFER, 0, this.buffer[i])
            gl.bindTransformFeedback(GL.TRANSFORM_FEEDBACK, null)

            this.vao[i] = gl.createVertexArray()
            gl.bindVertexArray(this.vao[i])
            if(this.mesh.ibo) gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.mesh.ibo)
            gl.bindBuffer(GL.ARRAY_BUFFER, this.mesh.vbo)
            for(let i = 1; i < this.mesh.format.length; i++){
                gl.enableVertexAttribArray(i-1)
                gl.vertexAttribPointer(i-1, this.mesh.format[i].size, this.mesh.format[i].type,
                    this.mesh.format[i].normalized, this.mesh.format[i].stride, this.mesh.format[i].offset)
            }
            gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer[i])
            for(let i = 0; i < format.length; i++){
                gl.enableVertexAttribArray(i)
                gl.vertexAttribPointer(i, format[i].size, format[i].type, format[i].normalized, format[i].stride, format[i].offset)
                gl.vertexAttribDivisor(i-1, 1)
            }   
            gl.bindVertexArray(null)        
        }
    }
    render(){
        const { gl } = this.context
        if(this.transform){
            gl.useProgram(this.transform.target)
            gl.bindVertexArray(this.transformRead[this.index])
            gl.bindTransformFeedback(GL.TRANSFORM_FEEDBACK, this.transformWrite[this.index ^= 1])
            gl.enable(GL.RASTERIZER_DISCARD)
            gl.beginTransformFeedback(GL.POINTS)

            this.update()
            //for(let i = 0; this.emitters.length; i++)
            //gl.drawArrays(GL.POINTS, 0, count)

            gl.endTransformFeedback()
            gl.disable(GL.RASTERIZER_DISCARD)
            gl.bindTransformFeedback(GL.TRANSFORM_FEEDBACK, null)
        }
        gl.useProgram(this.program.target)
        gl.bindVertexArray(this.vao[this.index])

        //gl.enable(GL.BLEND)
        //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        if(this.mesh.ibo) gl.drawElementsInstanced(this.mesh.drawMode, this.mesh.indexCount, GL.UNSIGNED_SHORT, this.mesh.indexOffset, this.instances)
        else gl.drawArraysInstanced(this.mesh.drawMode, this.mesh.indexOffset, this.mesh.indexCount, this.instances)
    }
    update(){
        
    }
}