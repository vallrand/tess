import { Application } from '../framework'
import { GL, ShaderProgram, UniformBlock, UniformBlockBindings } from '../webgl'

export class ParticleEmitter {
    uniform: UniformBlock
    offset: number = 0
    count: number = 0
    queue: number[] = []
    constructor(gl: WebGL2RenderingContext, program: ShaderProgram){
        this.uniform = new UniformBlock(gl, program.uniforms['EmitterUniforms'], UniformBlockBindings.EmitterUniforms)
    }
    render(context: Application, offset: number): number {
        const { gl, currentTime } = context

        const added = this.count - this.uniform.uniforms['uLastID'][0]
        const lifespan = this.uniform.uniforms['uLifespan'][1] - this.uniform.uniforms['uLifespan'][2]
        while(this.queue.length && this.queue[0] < currentTime){
            this.queue.shift()
            const amount = this.queue.shift()
            this.offset += amount
            this.count -= amount
        }
        if(added > 0) this.queue.push(currentTime + lifespan, added)

        if(this.count){
            this.uniform.bind(gl, UniformBlockBindings.EmitterUniforms)
            gl.drawArrays(GL.POINTS, this.offset, this.count)
        }
        this.offset = offset
        this.uniform.uniforms['uLastID'][0] = this.offset + this.count
        return this.count
    }
}