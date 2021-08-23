import { Application } from '../framework'
import { vec2, vec3, vec4, ease } from '../math'
import { GL, ShaderProgram, UniformBlock, UniformBlockBindings } from '../webgl'

interface ParticleEmitterOptions {
    uLifespan: vec4
    uLastID: [number]
}

export class ParticleEmitter {
    uniform: UniformBlock
    offset: number = 0
    count: number = 0
    rate: number = 0
    private elapsed: number = 0
    queue: number[] = []
    constructor(gl: WebGL2RenderingContext, program: ShaderProgram){
        this.uniform = new UniformBlock(gl, program.uniforms['EmitterUniforms'], UniformBlockBindings.EmitterUniforms)
    }
    render(context: Application, offset: number, options: { limit: number }): number {
        const { gl, currentTime, deltaTime } = context

        if(this.rate) for(this.elapsed += deltaTime; this.elapsed > this.rate; this.elapsed -= this.rate) this.count++
        else this.elapsed = 0

        while(this.queue.length && this.queue[0] < currentTime){
            this.queue.shift()
            const amount = this.queue.shift()
            this.offset += amount
            this.count -= amount
        }
        const count = Math.min(options.limit - this.offset, this.count)
        const added = count - this.uniform.uniforms['uLastID'][0]
        const lifespan = this.uniform.uniforms['uLifespan'][1] - this.uniform.uniforms['uLifespan'][2]
        if(added > 0) this.queue.push(currentTime + lifespan, added)
        if(count){
            this.uniform.bind(gl, UniformBlockBindings.EmitterUniforms)
            gl.drawArrays(GL.POINTS, this.offset, count)
        }
        this.offset = offset
        this.uniform.uniforms['uLastID'][0] = this.offset + count
        return count
    }
}