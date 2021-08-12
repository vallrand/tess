import { vec4 } from './math'
import { Application, System } from './framework'
import { GL, UniformSamplerBindings } from './webgl'
import { PostEffectPass } from './deferred/PostEffectPass'

export class DebugSystem implements System {
    public texture: WebGLTexture
    constructor(private readonly context: Application){
        window['app'] = context
    }
    update(){
        if(this.texture) this.renderDebugTexture(this.texture)
    }
    renderDebugTexture(texture: WebGLTexture){
        const gl = this.context.gl
        const plane = this.context.get(PostEffectPass).plane
        const program = this.context.get(PostEffectPass).blit

        gl.bindFramebuffer(GL.FRAMEBUFFER, null)
        gl.bindVertexArray(plane.vao)
        gl.useProgram(program.target)
        program.uniforms['uMask'] = vec4.ONE

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(GL.TEXTURE_2D, texture)

        gl.drawElements(GL.TRIANGLES, plane.indexCount, GL.UNSIGNED_SHORT, plane.indexOffset)
    }
}