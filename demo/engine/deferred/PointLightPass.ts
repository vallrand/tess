import { mat4, vec3 } from '../math'
import { createSphere } from '../geometry'
import { Application, System, Factory } from '../framework'
import { MeshSystem, MeshBuffer } from '../Mesh'
import { CameraSystem } from '../Camera'
import { Transform } from '../Transform'
import { BoundingVolume } from '../FrustumCulling'
import { GL, ShaderProgram, UniformBlock, UniformBlockBindings } from '../webgl'

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

export class PointLightPass extends Factory<PointLight> implements System {
    private readonly program: ShaderProgram
    private readonly sphere: MeshBuffer
    constructor(private readonly context: Application){
        super(PointLight)
        const gl: WebGL2RenderingContext = context.gl
        this.program = ShaderProgram(gl, require('./point_light_vert.glsl'), require('./pbr_frag.glsl'), {
            OMNILIGHT: true, GGX: true, SCHLICK: true
        })

        const sphere = createSphere({ longitude: 32, latitude: 32, radius: 1 })
        this.sphere = this.context.get(MeshSystem).uploadVertexData(sphere.vertexArray, sphere.indexArray, sphere.format)
    }
    public delete(light: PointLight): void {
        super.delete(light)
        light.frame = 0
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
