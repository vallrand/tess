import { mat4, vec3 } from '../math'
import { createSphere } from '../geometry'
import { Application, ISystem, Factory } from '../framework'
import { MeshSystem, MeshBuffer } from '../Mesh'
import { CameraSystem } from '../scene/Camera'
import { Transform } from '../scene/Transform'
import { BoundingVolume } from '../scene/FrustumCulling'
import { GL, ShaderProgram, UniformBlock, UniformBlockBindings } from '../webgl'
import { PipelinePass } from './PipelinePass'
import { shaders } from '../shaders'

export class PointLight {
    public index: number = -1
    public frame: number = 0
    public transform: Transform
    public readonly color: vec3 = vec3(1,1,1)
    public intensity: number = 1
    public radius: number = 1
    public uniform: UniformBlock
    public readonly bounds = new BoundingVolume
    public update(context: Application){
        if(this.frame && this.frame >= this.transform.frame) return
        this.frame = context.frame
        if(!this.uniform) this.uniform = new UniformBlock(context.gl, { byteSize: 4*(16+4+1+1) }, UniformBlockBindings.LightUniforms)
        this.bounds.update(this.transform, this.radius)
        this.uniform.data.set(this.transform?.matrix || mat4.IDENTITY, 0)
        this.uniform.data.set(this.color, 16)
        this.uniform.data[20] = this.radius
        this.uniform.data[21] = this.intensity
    }
}

export class PointLightPass extends PipelinePass implements ISystem {
    private readonly program: ShaderProgram
    private readonly sphere: MeshBuffer
    private readonly pool: PointLight[] = []
    public readonly list: PointLight[] = []
    constructor(context: Application){
        super(context)
        const gl: WebGL2RenderingContext = context.gl
        this.program = ShaderProgram(gl, shaders.light_vert, shaders.pbr_frag, {
            OMNILIGHT: true, GGX: true, SCHLICK: true
        })

        const sphere = createSphere({ longitude: 32, latitude: 32, radius: 1 })
        this.sphere = this.context.get(MeshSystem).uploadVertexData(sphere.vertexArray, sphere.indexArray, sphere.format)
    }
    public create(): PointLight {
        const item = this.pool.pop() || new PointLight()
        item.index = this.list.push(item) - 1
        return item
    }
    public delete(item: PointLight): void {
        if(item.index == -1) return
        this.list[item.index] = this.list[this.list.length - 1]
        this.list[item.index].index = item.index
        this.list.length--
        item.index = -1
        this.pool.push(item)

        item.frame = 0
    }
    public update(): void {
        const gl = this.context.gl
        const camera = this.context.get(CameraSystem).camera
        const lights: PointLight[] = this.list

        gl.useProgram(this.program.target)
        gl.bindVertexArray(this.sphere.vao)
    
        for(let i = lights.length - 1; i >= 0; i--){
            const light = lights[i]
            light.update(this.context)
            if(!camera.culling.cull(light.bounds)) continue

            light.uniform.bind(gl, UniformBlockBindings.LightUniforms)
            gl.drawElements(GL.TRIANGLES, this.sphere.indexCount, GL.UNSIGNED_SHORT, this.sphere.indexOffset)
        }
    }
}
