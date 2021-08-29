import { vec4, mat4, binarySearch, insertionSort } from '../math'
import { Application, System, Factory } from '../framework'
import { createBox } from '../geometry'
import { CameraSystem } from '../scene/Camera'
import { Transform } from '../scene/Transform'
import { MeshSystem, MeshBuffer } from '../Mesh'
import { DeferredGeometryPass } from './GeometryPass'
import { SpriteMaterial } from '../Sprite'
import { BoundingVolume } from '../scene/FrustumCulling'
import { createTexture, GL, ShaderProgram, UniformBlock, UniformBlockBindings, UniformSamplerBindings, VertexDataFormat } from '../webgl'
import { DecalBatch, IBatchedDecal } from '../batch'
import { IEffect } from '../pipeline'
import { shaders } from '../shaders'

export class Decal implements IBatchedDecal {
    frame: number = 0
    order: number = 0
    transform: Transform
    material: SpriteMaterial
    readonly color: vec4 = vec4(1,1,1,1)
    public threshold: number = 0
    public readonly bounds = new BoundingVolume
    public update(frame: number, context: Application){
        if(this.frame && this.frame >= this.transform.frame) return
        this.frame = frame
        this.bounds.update(this.transform, 1)
    }
}

export class DecalPass implements System {
    private static readonly orderSort = <T extends { order: number }>(a: T, b: T) => a.order - b.order
    private readonly pool: Decal[] = []
    public readonly list: Decal[] = []
    public readonly batch: DecalBatch
    private readonly program: ShaderProgram
    private readonly fbo: WebGLFramebuffer
    private readonly defaultNormalMap: WebGLTexture
    public readonly effects: IEffect[] = []
    constructor(private readonly context: Application){
        const { gl } = this.context
        this.batch = new DecalBatch(gl, 128)
        this.program = ShaderProgram(gl, shaders.decal_vert, shaders.decal_frag, {
            INSTANCED: true, NORMAL_MAPPING: !false, MASK: true
        })
        this.program.uniforms['uLayer'] = 1
        this.program.uniforms['uDissolveEdge'] = 0.1
        this.defaultNormalMap = createTexture(gl, {
            width: 1, height: 1, data: new Uint8Array([0x7F,0x7F,0x7F,0x00])
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
    public create(order: number): Decal {
        const item = this.pool.pop() || new Decal()
        item.order = order
        const index = binarySearch(this.list, item, DecalPass.orderSort, true)
        this.list.splice(index, 0, item)
        return item
    }
    public delete(item: Decal): void {
        const index = this.list.indexOf(item)
        if(index == -1) return
        this.list.splice(index, 1)
        this.pool.push(item)
        vec4.copy(vec4.ONE, item.color)
        item.frame = item.threshold = 0
        item.transform = item.material = null
    }
    update(): void {
        const { gl } = this.context
        gl.enable(GL.DEPTH_TEST)
        gl.depthFunc(GL.GEQUAL)
        gl.depthMask(false)
        gl.cullFace(GL.FRONT)
        gl.enable(GL.BLEND)
        gl.blendFuncSeparate(GL.ONE, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE)

        gl.bindFramebuffer(GL.FRAMEBUFFER, this.fbo)
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uPositionBuffer)
        gl.bindTexture(GL.TEXTURE_2D, this.context.get(DeferredGeometryPass).position)

        const camera = this.context.get(CameraSystem).camera
        let material: SpriteMaterial = null
        for(let i = this.list.length - 1; i >= 0; i--){
            const decal: Decal = this.list[i]
            decal.update(this.context.frame, this.context)
            if(!camera.culling.cull(decal.bounds)) continue

            if(!material) material = decal.material
            if(decal.material.diffuse !== material.diffuse || decal.material.program !== material.program) i++
            else if(!this.batch.render(decal)) i++
            else if(i) continue

            const { diffuse, normal = this.defaultNormalMap, program = this.program } = material
            material = null
            const instances = this.batch.instanceOffset
            if(!instances) continue

            this.batch.bind()
            gl.useProgram(program.target)
            
            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uDiffuseMap)
            gl.bindTexture(GL.TEXTURE_2D, diffuse)
            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uNormalMap)
            gl.bindTexture(GL.TEXTURE_2D, normal)
            
            gl.drawElementsInstanced(GL.TRIANGLES, DecalBatch.unitCubeIndices.length, GL.UNSIGNED_SHORT, 0, instances)
        }

        for(let i = this.effects.length - 1; i >= 0; i--) this.effects[i].apply()
    }
}