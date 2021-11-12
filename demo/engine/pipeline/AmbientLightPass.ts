import { vec3, quat, mat4 } from '../math'
import { Application, ISystem } from '../framework'
import { createTexture, GL, ShaderProgram, UniformBlock, UniformBlockBindings, UniformSamplerBindings } from '../webgl'
import { DeferredGeometryPass } from './GeometryPass'
import { PostEffectPass } from './PostEffectPass'
import * as shaders from '../shaders'
import { PipelinePass } from './PipelinePass'
import { LightField, ReflectionProbe } from './effects'
import { CameraSystem } from '../scene'

export class HemisphereLight {
    public frame: number = 0
    public readonly axis: vec3 = vec3(0,1,0)
    public readonly color0: vec3 = vec3(0.15,0.16,0.18)
    public readonly color1: vec3 = vec3(0.05,0.04,0.03)
    public uniform: UniformBlock
    public update(context: Application){
        if(this.frame) return
        this.frame = context.frame
        if(!this.uniform) this.uniform = new UniformBlock(context.gl, { byteSize: 4*(4+4+4) }, UniformBlockBindings.LightUniforms)
        this.uniform.data.set(this.axis, 0)
        this.uniform.data.set(this.color0, 4)
        this.uniform.data.set(this.color1, 8)
    }
}

export class AmbientLightPass extends PipelinePass implements ISystem {
    public environment: HemisphereLight = new HemisphereLight
    private readonly program: ShaderProgram
    public reflection: LightField
    constructor(context: Application){
        super(context)
        this.program = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.ambient_frag, {
            REFLECTION_MAP: true, IRRADIANCE_MAP: false, IBL: true
        })
        this.program.uniforms['uBRDFLUT'] = UniformSamplerBindings.uAttributes

        this.reflection = new LightField(this.context)
    }
    public update(): void {
        const { gl } = this.context
        const { camera, controller } = this.context.get(CameraSystem)
        this.reflection.relocateProbes(controller.cameraTarget)
        camera.uniform.bind(gl, UniformBlockBindings.CameraUniforms)

        this.context.get(PostEffectPass).swapRenderTarget(false, false)
        gl.depthMask(false)
        gl.disable(GL.DEPTH_TEST)
        gl.enable(GL.BLEND)
        gl.blendFunc(GL.ONE, GL.ONE)
        gl.enable(GL.CULL_FACE)
        gl.cullFace(GL.BACK)
        gl.clear(GL.COLOR_BUFFER_BIT)

        this.context.get(DeferredGeometryPass).bindReadBuffer()

        this.environment.update(this.context)
        const plane = this.context.get(PostEffectPass).plane

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uAttributes)
        gl.bindTexture(GL.TEXTURE_2D, this.reflection.brdfLUT)

        gl.useProgram(this.program.target)
        gl.bindVertexArray(plane.vao)
        this.environment.uniform.bind(gl, UniformBlockBindings.LightUniforms)

        for(let i = this.reflection.probes.length - 1; i >= 0; i--){
            const probe = this.reflection.probes[i]
            const weight = this.reflection.calculateWeight(controller.cameraTarget, probe)
            if(!weight) continue

            this.program.uniforms['uWeight'] = weight
            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uEnvironmentMap)
            gl.bindTexture(GL.TEXTURE_CUBE_MAP, this.reflection.enabled ? probe.cubemap : null)

            gl.drawElements(GL.TRIANGLES, plane.indexCount, GL.UNSIGNED_SHORT, plane.indexOffset)
        }
    }
}