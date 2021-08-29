import { range, mat3x2, vec4, mat3, vec3, mat4 } from '../math'
import { Application, System } from '../framework'
import { GL, IVertexAttribute, ShaderProgram, UniformBlockBindings, UniformSamplerBindings } from '../webgl'
import { PostEffectPass } from './PostEffectPass'
import { Material, RenderTexture } from '../Material'
import { GeometryBatch, IBatched, Sprite, Line } from '../batch'
import { IEffect } from '../pipeline'
import { CameraSystem } from '../scene/Camera'
import { Mesh, MeshSystem } from '../Mesh'
import { DeferredGeometryPass } from './GeometryPass'

export class ParticleEffectPass implements System {
    private static readonly batchSize: number = 1024
    public readonly effects: IEffect[] = []
    private readonly batch: GeometryBatch
    private readonly list: IBatched[] = []
    private readonly program: ShaderProgram
    constructor(private readonly context: Application){
        const gl: WebGL2RenderingContext = context.gl
        const maxTextures = gl.getParameter(GL.MAX_TEXTURE_IMAGE_UNITS)
        this.batch = new GeometryBatch(gl, ParticleEffectPass.batchSize * 4, ParticleEffectPass.batchSize * 6)
        this.program = ShaderProgram(gl,
            require('../shaders/batch_vert.glsl'), require('../shaders/batch_frag.glsl')
            .replace(/^#FOR(.*)$/gm, (match, line) => range(maxTextures).map(i => line.replace(/#i/g,i)).join('\n')), {
            MAX_TEXTURE_UNITS: maxTextures
        })
        this.program.uniforms['uSamplers'] = range(maxTextures)
    }
    public add(...items: (IBatched | Mesh)[]): void {
        this.list.push(...items as any)
    }
    public remove(...items: (IBatched | Mesh)[]): void {
        for(let i = items.length - 1; i >= 0; i--){
            const item = items[i]
            const index = this.list.indexOf(item as any)
            if(index == -1) continue
            this.list[index] = this.list[this.list.length - 1]
            this.list.length--
        }
    }
    private sort(list: IBatched[], origin: vec3): void {
        for(let length = list.length, j, i = 0; i < length; i++){
            let temp = list[i]
            //calc distance to camera
            for(j = i - 1; j >= 0 && temp.order > list[j].order; j--)
                list[j+1] = list[j]
            list[j+1] = temp
        }
    }
    public update(): void {
        const { gl } = this.context

        gl.cullFace(GL.BACK)
        gl.enable(GL.CULL_FACE)
        gl.depthFunc(GL.LEQUAL)
        gl.enable(GL.DEPTH_TEST)
        gl.enable(GL.BLEND)
        gl.blendFuncSeparate(GL.ONE, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE)

        const camera = this.context.get(CameraSystem).camera
        //this.sort(this.list, camera.transform.position)
        let program: ShaderProgram = this.list[this.list.length - 1]?.material.program || this.program
        for(let i = this.list.length - 1; i >= 0; i--){
            const item = this.list[i]
            item.update(this.context, camera)
            if(!camera.culling.cull(item.bounds)) continue

            const itemProgram = item.material.program || this.program
            const flush = itemProgram === program && item.vertices && this.batch.render(item)
            if(flush && i) continue
            if(this.batch.indexOffset){
                gl.useProgram(program.target)
                const indexCount = this.batch.indexOffset
                this.batch.bind()
                gl.drawElements(GL.TRIANGLES, indexCount, GL.UNSIGNED_SHORT, 0)
            }
            if(item instanceof Mesh){
                this.renderMesh(item)
                continue
            }
            if(!flush) i++
            program = itemProgram
        }
        
        this.context.get(DeferredGeometryPass).bindReadBuffer()
        for(let i = this.effects.length - 1; i >= 0; i--) this.effects[i].apply()
    }
    private renderMesh(mesh: Mesh){
        const { gl } = this.context
        gl.bindVertexArray(mesh.buffer.vao)
        gl.useProgram(mesh.material.program.target)
        mesh.material.bind(gl, null)

        this.context.get(DeferredGeometryPass).bindReadBuffer()
        mesh.uniform.bind(gl, UniformBlockBindings.ModelUniforms)
        gl.drawElements(mesh.buffer.drawMode, mesh.buffer.indexCount, GL.UNSIGNED_SHORT, mesh.buffer.indexOffset)
    }
}