import { Application } from '../../engine/framework'
import { lerp, vec2, vec3, vec4, quat, mat4, ease } from '../../engine/math'
import { MeshSystem, Mesh, IKRig, IKBone, IKChain, LocalHingeConstraint, BallJointConstraint, ArmatureNode } from '../../engine/components'
import { MeshMaterial } from '../../engine/materials'
import { TransformSystem } from '../../engine/scene'
import { DeferredGeometryPass } from '../../engine/pipeline'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EmitterTrigger } from '../../engine/scene/Animation'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

import { DebugSystem } from '../../engine/debug'

class Spider4Rig extends IKRig {
    mesh: Mesh
    private readonly ballJoint = new BallJointConstraint()
    private readonly hingeJoint = new LocalHingeConstraint()
    private limb00: IKChain
    private limb01: IKChain
    private limb11: IKChain
    private limb10: IKChain
    private target00: vec3 = vec3()
    private target01: vec3 = vec3()
    private target11: vec3 = vec3()
    private target10: vec3 = vec3()

    private readonly bindings: any[] = []
    constructor(private readonly context: Application){
        super()
        this.hingeJoint.min = 0
    }
    private attachLimb(thighbone: ArmatureNode, shinbone: ArmatureNode){
        const joint0 = vec3(), joint1 = vec3(), joint2 = vec3()
        const bind0 = quat(), bind1 = quat(), temp = quat()

        mat4.decompose(thighbone.globalTransform, joint0, joint2, bind0)
        mat4.decompose(shinbone.globalTransform, joint1, joint2, bind1)
        mat4.transform([0,1,0], shinbone.globalTransform, joint2)

        const chain = this.add(joint0)
        chain.parent = new IKBone()
        chain.parent.set(vec3.ZERO, joint0)

        const femur = chain.add(joint1)
        const tibia = chain.add(joint2)
        femur.joint = this.ballJoint
        tibia.joint = this.hingeJoint

        quat.multiply(quat.conjugate(femur.rotation, temp), bind0, bind0)
        quat.multiply(quat.conjugate(tibia.rotation, temp), bind1, bind1)
        vec3.copy(joint2, chain.target)

        this.bindings.push({
            inverseBind: bind0,
            bone: femur,
            node: thighbone
        }, {
            inverseBind: bind1,
            bone: tibia,
            node: shinbone
        })

        return chain
    }
    build(mesh: Mesh){
        this.mesh = mesh

        mesh.armature.update(this.context)
        this.mesh.transform.recalculate(this.context.frame)
        this.context.get(DebugSystem).skeleton.add(this.mesh)

        this.limb01 = this.attachLimb(mesh.armature.nodes[1], mesh.armature.nodes[2])
        this.limb11 = this.attachLimb(mesh.armature.nodes[3], mesh.armature.nodes[4])
        this.limb00 = this.attachLimb(mesh.armature.nodes[5], mesh.armature.nodes[6])
        this.limb10 = this.attachLimb(mesh.armature.nodes[7], mesh.armature.nodes[8])

        vec3.copy(this.limb01.target, this.target01)
        vec3.copy(this.limb00.target, this.target00)
        vec3.copy(this.limb11.target, this.target11)
        vec3.copy(this.limb10.target, this.target10)

        // const [ ,leg01,foot01, leg11,foot11, leg00,foot00, leg10,foot10 ] = armature.nodes

        // mat4.transform(vec3.ZERO, leg00.globalTransform, this.pivot00.end)
        // mat4.transform(vec3.ZERO, leg01.globalTransform, this.pivot01.end)
        // mat4.transform(vec3.ZERO, leg11.globalTransform, this.pivot11.end)
        // mat4.transform(vec3.ZERO, leg10.globalTransform, this.pivot10.end)
        // this.pivot00.set(vec3.ZERO, this.pivot00.end)
        // this.pivot01.set(vec3.ZERO, this.pivot01.end)
        // this.pivot11.set(vec3.ZERO, this.pivot11.end)
        // this.pivot10.set(vec3.ZERO, this.pivot10.end)

        // this.limb00 = this.add(this.pivot00.end, this.pivot00)
        // this.limb01 = this.add(this.pivot01.end, this.pivot01)
        // this.limb11 = this.add(this.pivot11.end, this.pivot11)
        // this.limb10 = this.add(this.pivot10.end, this.pivot10)

        // const joint00 = this.limb00.add(mat4.transform(vec3.ZERO, foot00.globalTransform, vec3()))
        // const joint01 = this.limb01.add(mat4.transform(vec3.ZERO, foot01.globalTransform, vec3()))
        // const joint11 = this.limb11.add(mat4.transform(vec3.ZERO, foot11.globalTransform, vec3()))
        // const joint10 = this.limb10.add(mat4.transform(vec3.ZERO, foot10.globalTransform, vec3()))

        // joint00['o'] = (q => (mat4.decompose(leg00.globalTransform, vec3(), vec3(), q), q))(quat())
        // joint01['o'] = (q => (mat4.decompose(leg01.globalTransform, vec3(), vec3(), q), q))(quat())
        // joint11['o'] = (q => (mat4.decompose(leg11.globalTransform, vec3(), vec3(), q), q))(quat())
        // joint10['o'] = (q => (mat4.decompose(leg10.globalTransform, vec3(), vec3(), q), q))(quat())

        // joint00['o2'] = quat.normalize(leg00.rotation, quat())
        // joint01['o2'] = quat.normalize(leg01.rotation, quat())
        // joint11['o2'] = quat.normalize(leg11.rotation, quat())
        // joint10['o2'] = quat.normalize(leg10.rotation, quat())

        // joint00['o3'] = quat.copy(joint00.rotation, quat())
        // joint01['o3'] = quat.copy(joint01.rotation, quat())
        // joint11['o3'] = quat.copy(joint11.rotation, quat())
        // joint10['o3'] = quat.copy(joint10.rotation, quat())

        // joint00.joint = joint01.joint = joint11.joint = joint10.joint = this.ballJoint

        // const end00 = mat4.transform([0,1,0], foot00.globalTransform, vec3())
        // const end01 = mat4.transform([0,1,0], foot01.globalTransform, vec3())
        // const end11 = mat4.transform([0,1,0], foot11.globalTransform, vec3())
        // const end10 = mat4.transform([0,1,0], foot10.globalTransform, vec3())

        // const _joint00 = this.limb00.add(end00)
        // const _joint01 = this.limb01.add(end01)
        // const _joint11 = this.limb11.add(end11)
        // const _joint10 = this.limb10.add(end10)

        // _joint00['o'] = (q => (mat4.decompose(foot00.globalTransform, vec3(), vec3(), q), q))(quat())
        // _joint01['o'] = (q => (mat4.decompose(foot01.globalTransform, vec3(), vec3(), q), q))(quat())
        // _joint11['o'] = (q => (mat4.decompose(foot11.globalTransform, vec3(), vec3(), q), q))(quat())
        // _joint10['o'] = (q => (mat4.decompose(foot10.globalTransform, vec3(), vec3(), q), q))(quat())

        // _joint00['o2'] = quat.normalize(foot00.rotation, quat())
        // _joint01['o2'] = quat.normalize(foot01.rotation, quat())
        // _joint11['o2'] = quat.normalize(foot11.rotation, quat())
        // _joint10['o2'] = quat.normalize(foot10.rotation, quat())

        // _joint00['o3'] = quat.copy(_joint00.rotation, quat())
        // _joint01['o3'] = quat.copy(_joint01.rotation, quat())
        // _joint11['o3'] = quat.copy(_joint11.rotation, quat())
        // _joint10['o3'] = quat.copy(_joint10.rotation, quat())

        // vec3.copy(_joint00.end, this.target00)
        // vec3.copy(_joint01.end, this.target01)
        // vec3.copy(_joint11.end, this.target11)
        // vec3.copy(_joint10.end, this.target10)

        // _joint00.joint = _joint01.joint = _joint11.joint = _joint10.joint = this.hingeJoint
        this.context.get(DebugSystem).skeleton.addIK(this)

        this['original00'] = vec3.copy(this.target00, vec3())
        this['original01'] = vec3.copy(this.target01, vec3())
        this['original11'] = vec3.copy(this.target11, vec3())
        this['original10'] = vec3.copy(this.target10, vec3())
    }
    update(){
        this.mesh.armature.update(this.context)


        // const [ ,leg01,foot01, leg11,foot11, leg00,foot00, leg10,foot10 ] = this.mesh.armature.nodes
        // //update origin
        // mat4.transform(vec3.ZERO, leg00.globalTransform, this.pivot00.end)
        // mat4.transform(vec3.ZERO, leg01.globalTransform, this.pivot01.end)
        // mat4.transform(vec3.ZERO, leg11.globalTransform, this.pivot11.end)
        // mat4.transform(vec3.ZERO, leg10.globalTransform, this.pivot10.end)
        //update rotations? new class? PivotBone?

        this.target00[1] = 0.5 + 0.5 * Math.sin(this.context.currentTime)
        this.target01[1] = 0.5 + 0.5 * Math.sin(this.context.currentTime)
        this.target11[1] = 0.5 + 0.5 * Math.sin(this.context.currentTime)
        this.target10[1] = 0.5 + 0.5 * Math.sin(this.context.currentTime)

        this.target00[2] = this['original00'][2] + 0.5 * Math.cos(this.context.currentTime * 4)
        this.target01[2] = this['original01'][2] + 0.5 * Math.cos(this.context.currentTime * 4)
        this.target11[2] = this['original11'][2] + 0.5 * Math.cos(this.context.currentTime * 4)
        this.target10[2] = this['original10'][2] + 0.5 * Math.cos(this.context.currentTime * 4)

        //move targets into local space of mesh
        const inverseModel = mat4.invert(mat4.IDENTITY || this.mesh.transform.matrix, mat4())
        mat4.transform(this.target00, inverseModel, this.limb00.target)
        mat4.transform(this.target01, inverseModel, this.limb01.target)
        mat4.transform(this.target11, inverseModel, this.limb11.target)
        mat4.transform(this.target10, inverseModel, this.limb10.target)

        super.update()

        // //apply rotations
        // const legbone00 = this.limb00.bones[0]
        // const footbone00 = this.limb00.bones[1]
        // const legbone01 = this.limb01.bones[0]
        // const footbone01 = this.limb01.bones[1]
        // const legbone11 = this.limb11.bones[0]
        // const footbone11 = this.limb11.bones[1]
        // const legbone10 = this.limb10.bones[0]
        // const footbone10 = this.limb10.bones[1]

        // // const deltal00 = quat.multiply(legbone00.rotation, quat.conjugate(legbone00['o3'], quat()), quat())
        // // quat.multiply(deltal00, legbone00['o'], leg00.rotation)
        // // const deltal01 = quat.multiply(legbone01.rotation, quat.conjugate(legbone01['o3'], quat()), quat())
        // // quat.multiply(deltal01, legbone01['o'], leg01.rotation)
        // // const deltal11 = quat.multiply(legbone11.rotation, quat.conjugate(legbone11['o3'], quat()), quat())
        // // quat.multiply(deltal11, legbone11['o'], leg11.rotation)
        // // const deltal10 = quat.multiply(legbone10.rotation, quat.conjugate(legbone10['o3'], quat()), quat())
        // // quat.multiply(deltal10, legbone10['o'], leg10.rotation)

        // const deltal00 = quat.multiply(quat.conjugate(legbone00['o3'], quat()), legbone00['o'], quat())
        // quat.multiply(legbone00.rotation, deltal00, leg00.rotation)

        // // const deltal00 = quat.multiply(legbone00.rotation, quat.conjugate(legbone00['o3'], quat()), quat())
        // // quat.multiply(deltal00, legbone00['o'], leg00.rotation)
        // const deltal01 = quat.multiply(legbone01.rotation, quat.conjugate(legbone01['o3'], quat()), quat())
        // quat.multiply(deltal01, legbone01['o'], leg01.rotation)
        // const deltal11 = quat.multiply(legbone11.rotation, quat.conjugate(legbone11['o3'], quat()), quat())
        // quat.multiply(deltal11, legbone11['o'], leg11.rotation)
        // const deltal10 = quat.multiply(legbone10.rotation, quat.conjugate(legbone10['o3'], quat()), quat())
        // quat.multiply(deltal10, legbone10['o'], leg10.rotation)

        // this.backToLocal(leg00, this.mesh.armature)
        // this.backToLocal(leg01, this.mesh.armature)
        // this.backToLocal(leg11, this.mesh.armature)
        // this.backToLocal(leg10, this.mesh.armature)

        // const deltaf00 = quat.multiply(footbone00.rotation, quat.conjugate(footbone00['o3'], quat()), quat())
        // quat.multiply(deltaf00, footbone00['o'], foot00.rotation)
        // const deltaf01 = quat.multiply(footbone01.rotation, quat.conjugate(footbone01['o3'], quat()), quat())
        // quat.multiply(deltaf01, footbone01['o'], foot01.rotation)
        // const deltaf11 = quat.multiply(footbone11.rotation, quat.conjugate(footbone11['o3'], quat()), quat())
        // quat.multiply(deltaf11, footbone11['o'], foot11.rotation)
        // const deltaf10 = quat.multiply(footbone10.rotation, quat.conjugate(footbone10['o3'], quat()), quat())
        // quat.multiply(deltaf10, footbone10['o'], foot10.rotation)

        // this.backToLocal(foot00, this.mesh.armature)
        // this.backToLocal(foot01, this.mesh.armature)
        // this.backToLocal(foot11, this.mesh.armature)
        // this.backToLocal(foot10, this.mesh.armature)

        const worldOrientation = quat()
        for(let i = 0; i < this.bindings.length; i++){
            const { inverseBind, bone, node } = this.bindings[i]
            quat.multiply(bone.rotation, inverseBind, node.rotation)
            const parentTransform = this.mesh.armature.nodes[node.parent].globalTransform
            mat4.decompose(parentTransform, worldOrientation as any, worldOrientation as any, worldOrientation)
            quat.normalize(worldOrientation, worldOrientation)
            quat.conjugate(worldOrientation, worldOrientation)
            quat.multiply(worldOrientation, node.rotation, node.rotation)

            mat4.fromRotationTranslationScale(node.rotation, node.position, node.scale, node.globalTransform)
            mat4.multiply(parentTransform, node.globalTransform, node.globalTransform)
        }
        this.mesh.armature.frame = 0
    }
    backToLocal(node, armature){
        const index = armature.nodes.indexOf(node)
        const globalRotation = quat()
        const parentNode = armature.nodes[node.parent]
        mat4.decompose(parentNode.globalTransform, vec3(), vec3(), globalRotation)

        quat.normalize(globalRotation, globalRotation)
        quat.conjugate(globalRotation, globalRotation)
        quat.multiply(globalRotation, node.rotation, node.rotation)

        mat4.fromRotationTranslationScale(node.rotation, node.position, node.scale, node.globalTransform)
        if(node.parent != -1) mat4.multiply(armature.nodes[node.parent].globalTransform, node.globalTransform, node.globalTransform)
              
    }
}

export class Tarantula extends ControlUnit {
    private static readonly model: string = 'tarantula'
    private mesh: Mesh

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Tarantula.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(column, row, this.mesh.transform.position)

        modelAnimations[Tarantula.model].activate(0, this.mesh.armature)

        const rig = new Spider4Rig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {

    }
    public *strike(target: vec3): Generator<ActionSignal> {
    }
}