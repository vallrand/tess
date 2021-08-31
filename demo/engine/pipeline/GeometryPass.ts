import { mat4 } from '../math'
import { Application, ISystem } from '../framework'
import { CameraSystem } from '../scene/Camera'
import { MeshSystem } from '../components/Mesh'
import { GL, ShaderProgram, createTexture, UniformBlockBindings, UniformSamplerBindings } from '../webgl'
import { IEffect } from '.'
import { shaders } from '../shaders'
import { PipelinePass } from './PipelinePass'

export class DeferredGeometryPass extends PipelinePass implements ISystem {
    public albedo: WebGLTexture
    public normal: WebGLTexture
    public position: WebGLTexture
    public depth: WebGLRenderbuffer
    private gbuffer: WebGLFramebuffer
    private programs: ShaderProgram[]
    public readonly effects: IEffect[] = []

    constructor(context: Application){
        super(context)
        const gl: WebGL2RenderingContext = context.gl
        this.allocateGeometryBuffer(gl, gl.drawingBufferWidth, gl.drawingBufferHeight)
        this.programs = [
            ShaderProgram(gl, shaders.geometry_vert, shaders.geometry_frag, {
                NORMAL_MAPPING: true
            }),
            ShaderProgram(gl,shaders.geometry_vert, shaders.geometry_frag, {
                SKINNING: true, NORMAL_MAPPING: true, COLOR_INDEX: true
            })
            //BUMP_MAPPING
            //#define PARALLAX_LAYERS 32
        ]
    }
    public bindReadBuffer(){
        const gl = this.context.gl
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uPositionBuffer)
        gl.bindTexture(GL.TEXTURE_2D, this.position)
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uNormalBuffer)
        gl.bindTexture(GL.TEXTURE_2D, this.normal)
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uAlbedoBuffer)
        gl.bindTexture(GL.TEXTURE_2D, this.albedo)
    }
    update(): void {
        const gl = this.context.gl
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
        gl.bindFramebuffer(GL.FRAMEBUFFER, this.gbuffer)

        gl.enable(GL.CULL_FACE)
        gl.depthFunc(GL.LEQUAL)
        gl.enable(GL.DEPTH_TEST)
        gl.cullFace(GL.BACK)
        gl.clearColor(0,0,0,0)

        gl.depthMask(true)
        gl.disable(GL.BLEND)
        gl.clearDepth(1)
        gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT)

        const camera = this.context.get(CameraSystem).camera
        camera.uniform.bind(gl, UniformBlockBindings.CameraUniforms)
        this.context.get(CameraSystem).uniform.bind(gl, UniformBlockBindings.GlobalUniforms)

        const meshes = this.context.get(MeshSystem).list
        for(let programIndex = -1, i = meshes.length - 1; i >= 0; i--){
            const mesh = meshes[i]
            if(mesh.program == -1) continue
            if(programIndex != mesh.program) gl.useProgram(this.programs[programIndex = mesh.program].target)
            if(!camera.culling.cull(mesh.bounds)) continue
            mesh.uniform.bind(gl, UniformBlockBindings.ModelUniforms)
            
            //this.programs[programIndex].uniforms['uLayer'] = mesh.layer+1
            //this.programs[programIndex].uniforms['uModelMatrix'] = mesh.transform?.matrix || mat4.IDENTITY
            if(mesh.armature) this.programs[programIndex].uniforms['uBoneMatrix'] = mesh.armature.boneMatrix

            mesh.material.program = this.programs[programIndex]
            mesh.material.bind(gl)
            gl.bindVertexArray(mesh.buffer.vao)
            gl.drawElements(GL.TRIANGLES, mesh.buffer.indexCount, GL.UNSIGNED_SHORT, mesh.buffer.indexOffset)
        }
        for(let i = this.effects.length - 1; i >= 0; i--) this.effects[i].apply()
    }
    private allocateGeometryBuffer(gl: WebGL2RenderingContext, width: number, height: number){
        if(!gl.getExtension('EXT_color_buffer_float')) throw new Error('FLOAT color buffer not available')
        //if(!gl.getExtension('OES_texture_float_linear')) throw new Error('FLOAT color buffer not available')
        this.position = createTexture(gl, { width, height }, { format: GL.RGBA16F, filter: GL.NEAREST, wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE })
        this.normal = createTexture(gl, { width, height }, { format: GL.RGBA16F, filter: GL.NEAREST, wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE })
        this.albedo = createTexture(gl, { width, height }, { format: GL.RGBA8, filter: GL.NEAREST, wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE })
        
        this.depth = gl.createRenderbuffer()
        gl.bindRenderbuffer(GL.RENDERBUFFER, this.depth)
        gl.renderbufferStorage(GL.RENDERBUFFER, GL.DEPTH_COMPONENT16, width, height)

        this.gbuffer = gl.createFramebuffer()
        gl.bindFramebuffer(GL.FRAMEBUFFER, this.gbuffer)
    
        gl.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, this.depth)
        gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, this.position, 0)
        gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT1, GL.TEXTURE_2D, this.normal, 0)
        gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT2, GL.TEXTURE_2D, this.albedo, 0)
        gl.drawBuffers([ GL.COLOR_ATTACHMENT0, GL.COLOR_ATTACHMENT1, GL.COLOR_ATTACHMENT2 ])
        if(gl.checkFramebufferStatus(GL.FRAMEBUFFER) != GL.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer incomplete!')
        gl.bindFramebuffer(GL.FRAMEBUFFER, null)
    }
}