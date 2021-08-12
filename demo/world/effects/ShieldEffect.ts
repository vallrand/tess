import { Application, Factory } from '../../engine/framework'
import { IEffect } from '../../engine/deferred/ParticleEffectPass'
import { createSphere } from '../../engine/geometry'
import { GL, ShaderProgram } from '../../engine/webgl'
import { MeshSystem, MeshBuffer } from '../../engine/Mesh'
import { Transform } from '../../engine/Transform'

class ShieldEffectInstance {
    index: number
    transform: Transform
}

export class ShieldEffect extends Factory<ShieldEffectInstance> implements IEffect {
    public enabled: boolean = true
    private readonly program: ShaderProgram
    private readonly buffer: MeshBuffer
    constructor(private readonly context: Application){
        super(ShieldEffectInstance)
        this.program = ShaderProgram(this.context.gl,
            require('../../engine/shaders/geometry_vert.glsl'),
            require('../shaders/shield_frag.glsl'), {})
        const sphere = createSphere({ longitude: 32, latitude: 32, radius: 1 })
        this.buffer = this.context.get(MeshSystem).uploadVertexData(sphere.vertexArray, sphere.indexArray, sphere.format)
    }
    public apply(): void {
        if(!this.enabled || !this.list.length) return
        const { gl } = this.context

        gl.enable(GL.BLEND)
        gl.blendFunc(GL.ONE, GL.ONE)
        gl.disable(GL.CULL_FACE)

        gl.bindVertexArray(this.buffer.vao)
        gl.useProgram(this.program.target)
        this.program.uniforms['uTime'] = this.context.currentTime
        for(let i = this.list.length - 1; i >= 0; i--){
            this.program.uniforms['uModelMatrix'] = this.list[i].transform.matrix
            gl.drawElements(GL.TRIANGLES, this.buffer.indexCount, GL.UNSIGNED_SHORT, this.buffer.indexOffset)
        }
    }
}