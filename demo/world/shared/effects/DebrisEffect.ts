import { Application } from '../../../engine/framework'
import { vec3 } from '../../../engine/math'
import { ShaderProgram } from '../../../engine/webgl'
import { MeshSystem, MeshBuffer, Mesh } from '../../../engine/components'
import { MeshMaterial } from '../../../engine/materials'
import { TransformSystem } from '../../../engine/scene'
import { shaders } from '../../../engine/shaders'
import { SharedSystem } from '../../shared'

export class DebrisEffect {
    private material: MeshMaterial
    private buffer: MeshBuffer
    constructor(private readonly context: Application, name: string){
        this.material = new MeshMaterial()
        this.material.program = ShaderProgram(this.context.gl, shaders.debris_vert, shaders.geometry_frag, {
            VERTEX_COLOR: true, COLOR_INDEX: true
        })
        this.material.array = SharedSystem.textures.indexedTexture.array
        this.material.arrayLayers = SharedSystem.textures.indexedTexture.arrayLayers
        const max = 4
        Object.assign(this.material.program.uniforms, {
            uGravity: vec3(0,-9.8*2,0),
            uAngularVelocity: [0.2 * Math.PI * 2, 4 * Math.PI * 2],
            uVelocityMax: vec3(max, 10, max),
            uVelocityMin: vec3(-max, 4, -max)
        })

        const geometry = this.context.get(MeshSystem).models[name].geometry
        this.buffer = this.context.get(MeshSystem).uploadVertexData(geometry.vertexArray, geometry.indexArray, geometry.format)
        this.buffer.radius += max * 4
    }
    create(origin: vec3): Mesh {
        const mesh = this.context.get(MeshSystem).create()
        mesh.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, mesh.transform.position)

        mesh.buffer = this.buffer
        mesh.material = this.material
        mesh.layer = 1
        mesh.order = 3
        mesh.startTime = this.context.currentTime

        return mesh
    }
    delete(debris: Mesh){
        this.context.get(TransformSystem).delete(debris.transform)
        this.context.get(MeshSystem).delete(debris)
    }
}