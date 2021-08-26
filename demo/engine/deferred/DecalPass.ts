import { vec4, mat4 } from '../math'
import { Application, System, Factory } from '../framework'
import { createBox } from '../geometry'
import { CameraSystem } from '../Camera'
import { Transform } from '../Transform'
import { MeshSystem, MeshBuffer } from '../Mesh'
import { DeferredGeometryPass } from './GeometryPass'
import { SpriteMaterial } from '../Sprite'
import { BoundingVolume } from '../FrustumCulling'
import { GL, ShaderProgram, UniformBlock, UniformBlockBindings, UniformSamplerBindings, VertexDataFormat } from '../webgl'
import { DecalBatch, IBatchedDecal } from '../batch'
import { IEffect } from '../pipeline'
import { shaders } from '../shaders'

export class Decal implements IBatchedDecal {
    index: number = -1
    frame: number = 0
    transform: Transform
    material: SpriteMaterial
    readonly color: vec4 = vec4(1,1,1,1)
    public readonly bounds = new BoundingVolume
    public update(frame: number, context: Application){
        if(this.frame && this.frame >= this.transform.frame) return
        this.frame = frame
        this.bounds.update(this.transform, 1)
    }
}

export class DecalPass extends Factory<Decal> implements System {
    public readonly batch: DecalBatch
    private readonly program: ShaderProgram
    private readonly fbo: WebGLFramebuffer
    public readonly effects: IEffect[] = []
    constructor(private readonly context: Application){
        super(Decal)
        const gl: WebGL2RenderingContext = context.gl
        this.batch = new DecalBatch(gl, 128)
        this.program = ShaderProgram(gl, shaders.decal_vert, shaders.decal_frag, {
            INSTANCED: true, NORMAL_MAPPING: false
        })

        const geometry = this.context.get(DeferredGeometryPass)

        this.fbo = gl.createFramebuffer()
        gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo)
        gl.framebufferRenderbuffer(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.RENDERBUFFER, geometry.depth)
        gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, geometry.albedo, 0)
        gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT1, GL.TEXTURE_2D, geometry.normal, 0)
        gl.drawBuffers([ GL.COLOR_ATTACHMENT0, GL.COLOR_ATTACHMENT1 ])
        gl.bindFramebuffer(GL.FRAMEBUFFER, null)
    }
    public delete(decal: Decal): void {
        super.delete(decal)
        decal.frame = 0
        decal.transform = decal.material = null
    }
    update(): void {
        const gl = this.context.gl
        gl.enable(GL.DEPTH_TEST)
        gl.depthFunc(GL.GEQUAL)
        gl.depthMask(false)

        gl.cullFace(GL.FRONT)

        gl.enable(GL.BLEND)
        gl.blendFuncSeparate(GL.ONE, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE)

        gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo)

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uPositionBuffer)
        gl.bindTexture(GL.TEXTURE_2D, this.context.get(DeferredGeometryPass).position)

        gl.useProgram(this.program.target)

        const camera = this.context.get(CameraSystem).camera
        for(let i = this.list.length - 1; i >= 0; i--){
            const decal: Decal = this.list[i]
            decal.update(this.context.frame, this.context)
            if(!camera.culling.cull(decal.bounds)) continue

            if(!this.batch.render(decal)) i++
            else if(i) continue

            const instances = this.batch.instanceOffset
            if(!instances) continue
            this.batch.bind()

            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uDiffuseMap)
            gl.bindTexture(GL.TEXTURE_2D, decal.material.diffuse)

            gl.drawElementsInstanced(GL.TRIANGLES, DecalBatch.unitCubeIndices.length, GL.UNSIGNED_SHORT, 0, instances)
        }

        for(let i = this.effects.length - 1; i >= 0; i--) this.effects[i].apply()
    }
}