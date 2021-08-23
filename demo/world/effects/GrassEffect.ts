import { Application } from '../../engine/framework'
import { randomFloat, vec3, aabb3 } from '../../engine/math'
import { GL, createTexture, ShaderProgram } from '../../engine/webgl'
import { ParticleSystem, ParticleGeometry } from '../../engine/particles'

export class GrassEffect extends ParticleSystem<void> {
    constructor(context: Application){
        super(
            context, { limit: 1024, depthRead: true, depthWrite: true, cull: GL.NONE, blend: 0, format: [
                { name: 'aTransform', size: 3, type: GL.FLOAT, normalized: false, stride: 12, offset: 0 }
            ] }, ParticleGeometry.quad(context.gl),
            ShaderProgram(context.gl,
                require('../shaders/grass_vert.glsl'),
                require('../shaders/grass_frag.glsl'),
            {  }), null
        )
    }
    public fill(amount: number, bounds: aabb3){
        this.instances = amount
        const { gl } = this.context
        const vertexArray = new Float32Array(this.instances * 3)
        for(let i = 0; i < this.instances; i++){
            vertexArray[i * 3 + 0] = randomFloat(bounds[0], bounds[3], Math.random)
            vertexArray[i * 3 + 1] = randomFloat(bounds[1], bounds[4], Math.random)
            vertexArray[i * 3 + 2] = randomFloat(bounds[2], bounds[5], Math.random)
        }
        gl.bindBuffer(GL.ARRAY_BUFFER, this.buffer[0])
        gl.bufferSubData(GL.ARRAY_BUFFER, 0, vertexArray)
    }
    public apply(): void {
        super.apply()
    }
}