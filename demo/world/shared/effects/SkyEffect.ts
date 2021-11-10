import { Application } from '../../../engine/framework'
import { vec3 } from '../../../engine/math'
import { IEffect, PostEffectPass } from '../../../engine/pipeline'
import { MeshBuffer } from '../../../engine/components'
import { ShaderMaterial } from '../../../engine/materials'
import { GL, ShaderProgram, OpaqueLayer } from '../../../engine/webgl'
import * as shaders from '../../../engine/shaders'

export class SkyEffect implements IEffect {
    public enabled: boolean = true
    buffer: MeshBuffer
    material: ShaderMaterial
    readonly color: vec3 = vec3(1.2,0.4,0.6)
    constructor(private readonly context: Application){
        this.buffer = this.context.get(PostEffectPass).plane
        this.material = new ShaderMaterial()
        this.material.blendMode = null
        this.material.cullFace = GL.BACK
        this.material.depthTest = GL.LEQUAL
        this.material.depthWrite = true
        this.material.program = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.sky_frag, { RAYCAST: true })
        this.material.program.uniforms['uLayer'] = OpaqueLayer.Skybox
        this.material.program.uniforms['uFogColor'] = this.context.get(PostEffectPass).fog.color
        this.material.program.uniforms['uSkyColor'] = this.color
    }
    public apply(): void {
        if(!this.enabled) return
        const { gl } = this.context
        gl.useProgram(this.material.program.target)
        this.material.bind(gl)
        gl.bindVertexArray(this.buffer.vao)
        gl.drawElements(this.buffer.drawMode, this.buffer.indexCount, GL.UNSIGNED_SHORT, this.buffer.indexOffset)
    }
}