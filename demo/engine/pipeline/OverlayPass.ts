import { range, mat3x2, vec4, mat3 } from '../math'
import { Application, ISystem } from '../framework'
import { GL, ShaderProgram, UniformSamplerBindings } from '../webgl'
import { Batch2D } from './batch'
import { PipelinePass } from './PipelinePass'

export class OverlayPass extends PipelinePass implements ISystem {
    public readonly program: ShaderProgram
    public readonly batch: Batch2D
    constructor(context: Application){
        super(context)
        const gl: WebGL2RenderingContext = context.gl
        const maxTextures = gl.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS)
        let fragmentSource: string = require('../shaders/batch2d_frag.glsl')
        fragmentSource = fragmentSource.replace(/^#FOR(.*)$/gm, (match, line) => range(maxTextures)
        .map(i => line.replace(/#i/g,i)).join('\n'))
        this.program = ShaderProgram(gl, require('../shaders/batch2d_vert.glsl'), fragmentSource, {
            MAX_TEXTURE_UNITS: maxTextures
        })
        this.program.uniforms['uSamplers'] = range(maxTextures)
        this.batch = new Batch2D(this.context.gl, 4*1024, 6*1024, null)
    }
    public update(): void {
        // const gl: WebGL2RenderingContext = this.context.gl
        // gl.disable(GL.BLEND)
        // gl.bindVertexArray(this.plane.vao)

        // this.bloom.apply(this)

        // gl.bindFramebuffer(GL.FRAMEBUFFER, null)
        // gl.useProgram(this.program.target)

        // gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        // gl.bindTexture(GL.TEXTURE_2D, this.renderTarget[this.index])

        // gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uNormalMap)
        // gl.bindTexture(GL.TEXTURE_2D, this.bloom.texture)

        // this.program.uniforms['uFogColor'] = this.fog.color
        // this.program.uniforms['uFogRange'] = this.fog.range
        // this.program.uniforms['uBloomMask'] = this.bloom.mask

        // gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        // gl.drawElements(GL.TRIANGLES, this.plane.indexCount, GL.UNSIGNED_SHORT, this.plane.indexOffset)
    }
}