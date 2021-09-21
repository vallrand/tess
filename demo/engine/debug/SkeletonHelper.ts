import { Application, ISystem } from '../framework'
import { vec3, vec4, quat, mat4 } from '../math'
import { GL, UniformSamplerBindings, ShaderProgram, createTexture } from '../webgl'
import { shaders } from '../shaders'
import { createBox, applyTransform } from '../geometry'
import { DeferredGeometryPass, PostEffectPass } from '../pipeline'
import { MaterialSystem, MeshMaterial } from '../materials'
import { TransformSystem } from '../scene'
import { Armature, IKRig, Mesh, MeshBuffer, MeshSystem } from '../components'

export class SkeletonHelper {
    private readonly rigs: any[] = []
    iks: any[] = []
    private readonly material: MeshMaterial
    private readonly meshBuffer: MeshBuffer
    constructor(private readonly context: Application){
        this.material = new MeshMaterial()
        this.material.program = this.context.get(DeferredGeometryPass).programs[0]
        this.material.depthTest = GL.NONE
        this.material.depthWrite = false
        this.material.diffuse = createTexture(this.context.gl, { //TODO mesh default white color
            width: 1, height: 1, data: new Uint8Array([0xFF,0xFF,0xFF,0x7F])
        })
        this.material.normal = this.context.get(MaterialSystem).white.normal

        const boneShape = applyTransform(createBox({ width: 1, height: 1, depth: 1, open: false }),
        mat4.fromRotationTranslationScale(quat.IDENTITY, [0,0.5,0], [0.1,1,0.1], mat4()))
        this.meshBuffer = this.context.get(MeshSystem)
        .uploadVertexData(boneShape.vertexArray, boneShape.indexArray, boneShape.format, false)
    }
    update(){
        for(let i = 0; i < this.rigs.length; i++){
            const { mesh, node, armature } = this.rigs[i]
            mat4.decompose(node.globalTransform, mesh.transform.position, mesh.transform.scale, mesh.transform.rotation)
            mesh.transform.frame = 0
        }
        this.iks.forEach(ik => {
            const { mesh, bone } = ik
            vec3.copy(bone.start, mesh.transform.position)
            quat.copy(bone.rotation, mesh.transform.rotation)
            mesh.transform.scale[2] = bone.length
            mesh.transform.frame = 0
        })
    }
    public add(parent: Mesh){
        for(let i = 0; i < parent.armature.nodes.length; i++){
            const mesh = this.context.get(MeshSystem).create()
            mesh.buffer = this.meshBuffer
            mesh.material = this.material
            mesh.order = -16
            mesh.layer = 1
            vec4.set(1,0.8,0,1, mesh.color)
            mesh.transform = this.context.get(TransformSystem).create()
            mesh.transform.parent = parent.transform
            this.rigs.push({ mesh, node: parent.armature.nodes[i], armature: parent.armature })
        }
    }
    public addIK(ik: any){
        const boneShape = applyTransform(createBox({ width: 1, height: 1, depth: 1, open: false }),
        mat4.fromRotationTranslationScale(quat.IDENTITY, [0,0,0.5], [0.1,0.1,1], mat4()))
        const meshBuffer = this.context.get(MeshSystem)
        .uploadVertexData(boneShape.vertexArray, boneShape.indexArray, boneShape.format, false)

        for(let i = 0; i < ik.chains.length; i++)
        for(let j = 0; j < ik.chains[i].bones.length; j++){
            const mesh = this.context.get(MeshSystem).create()
            mesh.buffer = meshBuffer
            mesh.material = this.material
            mesh.order = -16
            mesh.layer = 1
            vec4.set(1,0,0,1, mesh.color)
            mesh.transform = this.context.get(TransformSystem).create()
            mesh.transform.parent = ik.mesh.transform
            this.iks.push({ mesh, bone: ik.chains[i].bones[j] })
        }
    }
}