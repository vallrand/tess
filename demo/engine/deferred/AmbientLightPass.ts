import { vec3, quat, mat4 } from '../math'
import { Application, System } from '../framework'
import { GL, ShaderProgram, UniformBlock, UniformBlockBindings } from '../webgl'
import { DeferredGeometryPass } from './GeometryPass'
import { PostEffectPass } from './PostEffectPass'

export class HemisphereLight {
    public frame: number = 0
    public readonly axis: vec3 = vec3(0,1,0)
    public readonly color0: vec3 = vec3(0.15,0.16,0.18)
    public readonly color1: vec3 = vec3(0.05,0.04,0.03)
    public uniform: UniformBlock
    public update(context: Application){
        if(this.frame) return
        this.frame = context.frame
        if(!this.uniform) this.uniform = new UniformBlock(context.gl, 4+4+4, UniformBlockBindings.LightUniforms)
        this.uniform.data.set(this.axis, 0)
        this.uniform.data.set(this.color0, 4)
        this.uniform.data.set(this.color1, 8)
    }
}

export class AmbientLightPass implements System {
    public environment: HemisphereLight = new HemisphereLight
    private readonly program: ShaderProgram
    constructor(private readonly context: Application){
        this.program = ShaderProgram(this.context.gl, require('./fullscreen_vert.glsl'), require('./ambient_light_frag.glsl'))
    }
    public update(): void {
        const gl = this.context.gl

        this.context.get(PostEffectPass).swapRenderTarget()
        gl.depthMask(false)
        gl.enable(GL.BLEND)
        gl.disable(GL.DEPTH_TEST)
        gl.cullFace(GL.FRONT)
        //this.renderer.SRC_ALPHA, this.renderer.ONE_MINUS_SRC_ALPHA
        gl.blendFunc(GL.ONE, GL.ONE)
        gl.clear(GL.COLOR_BUFFER_BIT)

        this.context.get(DeferredGeometryPass).bindReadBuffer()

        this.environment.update(this.context)
        const plane = this.context.get(PostEffectPass).plane

        gl.useProgram(this.program.target)
        gl.bindVertexArray(plane.vao)
        this.environment.uniform.bind(gl, UniformBlockBindings.LightUniforms)
        gl.drawElements(GL.TRIANGLES, plane.indexCount, GL.UNSIGNED_SHORT, plane.indexOffset)
    }
}