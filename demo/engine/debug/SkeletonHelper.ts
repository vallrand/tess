import { Application } from '../framework'
import { vec3, vec4, quat, mat4 } from '../math'
import { GL, ShaderProgram, createTexture, UniformBlock, UniformBlockBindings } from '../webgl'
import { shaders } from '../shaders'
import { createBox, applyTransform } from '../geometry'
import { MaterialSystem, MeshMaterial } from '../materials'
import { CameraSystem } from '../scene'
import { Armature, IKRig, Mesh, MeshBuffer, MeshSystem } from '../components'

export class SkeletonHelper {
    private readonly material: MeshMaterial
    private readonly buffer: MeshBuffer
    private readonly uniform: UniformBlock
    private readonly modelMatrix: mat4
    private readonly color: vec4

    public enabled: boolean = !true
    constructor(private readonly context: Application){
        this.material = new MeshMaterial()
        this.material.program = ShaderProgram(this.context.gl, shaders.geometry_vert, shaders.geometry_frag, {})
        this.material.diffuse = createTexture(this.context.gl, {
            width: 1, height: 1, data: new Uint8Array([0xFF,0xFF,0xFF,0x7F])
        })

        const boneShape = applyTransform(createBox({ width: 1, height: 1, depth: 1, open: false }),
        mat4.fromRotationTranslationScale(quat.IDENTITY, [0,0,0.5], [0.04,0.04,1], mat4()))
        this.buffer = this.context.get(MeshSystem)
        .uploadVertexData(boneShape.vertexArray, boneShape.indexArray, boneShape.format, false)

        this.uniform = new UniformBlock(this.context.gl, { byteSize: 4*(16+4+2) }, UniformBlockBindings.ModelUniforms)
        this.modelMatrix = this.uniform.data.subarray(0, 16) as any
        this.color = this.uniform.data.subarray(16, 16 + 4) as any
    }
    update(){
        if(!this.enabled) return
        const { gl } = this.context
        const meshes = this.context.get(MeshSystem).list
        const camera = this.context.get(CameraSystem).camera

        gl.useProgram(this.material.program.target)
        this.material.bind(gl)
        gl.bindVertexArray(this.buffer.vao)

        for(let i = meshes.length - 1; i >= 0; i--){
            const mesh: Mesh = meshes[i]
            if(mesh.color[3] === 0 || !mesh.armature) continue
            if(!camera.culling.cull(mesh.bounds, mesh.layer)) continue

            for(let j = 0; j < mesh.armature.nodes.length; j++){
                const node = mesh.armature.nodes[j]

                mat4.multiply(mesh.transform.matrix, node.globalTransform, this.modelMatrix)
                mat4.rotate(this.modelMatrix, -0.5 * Math.PI, vec3.AXIS_X, this.modelMatrix)
                vec4.set(0.8,0.7,0.2,1, this.color)

                this.uniform.bind(gl, UniformBlockBindings.ModelUniforms)
                gl.drawElements(GL.TRIANGLES, this.buffer.indexCount, GL.UNSIGNED_SHORT, this.buffer.indexOffset)
            }
            if(!mesh.armature.ik) continue
            const rig: IKRig = mesh.armature.ik
            for(let i = 0; i < rig.chains.length; i++)
            for(let j = 0; j < rig.chains[i].bones.length; j++){
                const bone = rig.chains[i].bones[j]

                mat4.fromRotationTranslationScale(bone.rotation, bone.start, [2,2, bone.length], this.modelMatrix)
                if(rig.chains[i].target) mat4.multiply(mesh.transform.matrix, this.modelMatrix, this.modelMatrix)
                vec4.set(0.8,0.2,0.7,1, this.color)

                this.uniform.bind(gl, UniformBlockBindings.ModelUniforms)
                gl.drawElements(GL.TRIANGLES, this.buffer.indexCount, GL.UNSIGNED_SHORT, this.buffer.indexOffset)
            }
        }
    }
}