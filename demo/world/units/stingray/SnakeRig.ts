import { Application } from '../../../engine/framework'
import { vec3, quat, mat4 } from '../../../engine/math'
import { IKRig, IKBone, SwingTwistConstraint, ArmatureNode } from '../../../engine/components'
import { Mesh } from '../../../engine/components'

export class SnakeRig extends IKRig {
    mesh: Mesh
    private readonly inverseModelMatrix: mat4 = mat4()
    private readonly worldTransform: mat4 = mat4()
    private readonly rotation: quat = quat()
    private readonly deltaMove: vec3 = vec3()
    private readonly constraint: SwingTwistConstraint
    private readonly prevJoints: vec3[] = []
    private friction: number = 0.96
    private frequency: number = Math.PI
    private amplitude: number = 0.6
    private distanceTravelled: number = 0
    constructor(private readonly context: Application){
        super()
        this.constraint = new SwingTwistConstraint()
        this.constraint.swingAngle = 0.4 * Math.PI
        this.constraint.twistAngle = 0 * Math.PI
        this.mode = 1
    }
    private attachTail(bones: ArmatureNode[]){
        const worldPosition = vec3(), worldRotation = quat(), prevRotation = quat()
        mat4.multiply(this.mesh.transform.matrix, bones[0].globalTransform, this.worldTransform)
        mat4.decompose(this.worldTransform, worldPosition, worldRotation as any, worldRotation)

        const tail = this.add(worldPosition)
        tail.target = null
        tail.parent = new IKBone()
        tail.parent.set(vec3.ZERO, tail.origin)
        tail.parent.index = this.mesh.armature.nodes.indexOf(bones[0])

        for(let i = 0; i < bones.length; i++){
            const prev = bones[i], next = bones[i + 1]
            quat.copy(worldRotation, prevRotation)

            if(!next) mat4.transform(vec3.AXIS_Y, this.worldTransform, worldPosition)
            else{
                mat4.multiply(this.mesh.transform.matrix, next.globalTransform, this.worldTransform)
                mat4.decompose(this.worldTransform, worldPosition, worldRotation as any, worldRotation)
            }

            const bone = tail.add(worldPosition)
            bone.joint = this.constraint
            bone.index = this.mesh.armature.nodes.indexOf(prev)
            quat.multiply(quat.conjugate(bone.rotation, bone.inverseBind), prevRotation, bone.inverseBind)

            this.prevJoints.push(vec3.copy(bone.end, vec3()))
        }
    }
    build(mesh: Mesh){
        this.mesh = mesh
        mesh.armature.update(this.context)
        mesh.transform.recalculate(this.context.frame)

        this.attachTail([
            mesh.armature.nodes[2],
            mesh.armature.nodes[3],
            mesh.armature.nodes[4],
            mesh.armature.nodes[5]
        ])
        this.distanceTravelled = 0
    }
    update(){        
        this.verletIntegration()
        super.update()
        this.updateArmature()
    }
    private verletIntegration(){
        if(!this.enabled) return
        for(let i = 0; i < this.chains.length; i++){
            vec3.copy(vec3.ONE, this.chains[i].lastOrigin)
            const pivot = this.chains[i].parent
            const node = this.mesh.armature.nodes[pivot.index]
            const parent = this.mesh.armature.nodes[node.parent]

            mat4.fromRotationTranslationScale(node.rotation, node.position, node.scale, this.worldTransform)
            mat4.multiply(parent.globalTransform, this.worldTransform, this.worldTransform)
            mat4.multiply(this.mesh.transform.matrix, this.worldTransform, this.worldTransform)

            mat4.transform(vec3.ZERO, this.worldTransform, pivot.start)
            this.distanceTravelled += vec3.distance(pivot.end, pivot.start)
            vec3.copy(pivot.start, pivot.end)
            mat4.transform([0,-1, 0], this.worldTransform, pivot.start)
            pivot.set(pivot.start, pivot.end)

            for(let j = 0; j < this.chains[i].bones.length; j++){
                const bone = this.chains[i].bones[j]
                const prevJoint = this.prevJoints[j]

                vec3.subtract(bone.end, prevJoint, this.deltaMove)
                vec3.scale(this.deltaMove, this.friction, this.deltaMove)
                vec3.copy(bone.end, prevJoint)
                vec3.add(this.deltaMove, bone.end, bone.end)

                if(j != 0) continue

                const time = 2 * this.distanceTravelled + this.context.currentTime
                const offset = this.amplitude * Math.cos(time * this.frequency)
                vec3.set(0,bone.length,offset, this.deltaMove)
                mat4.transform(this.deltaMove, this.worldTransform, this.deltaMove)
                vec3.lerp(bone.end, this.deltaMove, 0.6, bone.end)                
            }
        }
    }
    private updateArmature(){
        mat4.invert(this.mesh.transform.matrix, this.inverseModelMatrix)
        for(let i = this.chains.length - 1; i >= 0; i--)
        for(let j = 0; j < this.chains[i].bones.length; j++){
            const bone = this.chains[i].bones[j]
            const node = this.mesh.armature.nodes[bone.index]

            quat.multiply(bone.rotation, bone.inverseBind, this.rotation)
            mat4.fromRotationTranslationScale(this.rotation, bone.start, vec3.ONE, node.globalTransform)
            mat4.multiply(this.inverseModelMatrix, node.globalTransform, node.globalTransform)
            this.mesh.armature.updateBone(bone.index)
        }
    }
}