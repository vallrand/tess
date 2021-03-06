import { Application } from '../../../engine/framework'
import { lerp, vec3, quat, mat4 } from '../../../engine/math'
import { Mesh, ArmatureNode, IKRig, IKBone, LocalHingeConstraint, BallJointConstraint } from '../../../engine/components'
import { AnimationSystem, ActionSignal, ease } from '../../../engine/animation'
import { TerrainSystem } from '../../terrain'

export class Spider4Rig extends IKRig {
    mesh: Mesh
    private readonly ballJoint = new BallJointConstraint()
    private readonly hingeJoint = new LocalHingeConstraint()
    private readonly inverseModelMatrix: mat4 = mat4()
    private readonly worldOrientation: quat = quat()
    private readonly targets: {
        world: vec3
        local: vec3
        delta: vec3
        radius: number
        moving: boolean
        center: vec3
    }[] = []
    constructor(private readonly context: Application){
        super()
        this.hingeJoint.min = 0
        this.hingeJoint.max = Math.PI
        this.ballJoint.rotor = 2/3 * Math.PI
    }
    private attachLimb(thighbone: ArmatureNode, shinbone: ArmatureNode){
        const joint0 = vec3(), joint1 = vec3(), joint2 = vec3()
        const bind0 = quat(), bind1 = quat()

        mat4.decompose(thighbone.globalTransform, joint0, joint2, bind0)
        mat4.decompose(shinbone.globalTransform, joint1, joint2, bind1)
        mat4.transform(vec3.AXIS_Y, shinbone.globalTransform, joint2)

        const chain = this.add(joint0)
        chain.parent = new IKBone()
        chain.parent.set(vec3.ZERO, joint0)
        chain.parent.index = thighbone.parent

        const femur = chain.add(joint1)
        const tibia = chain.add(joint2)
        femur.index = this.mesh.armature.nodes.indexOf(thighbone)
        tibia.index = this.mesh.armature.nodes.indexOf(shinbone)
        femur.joint = this.ballJoint
        tibia.joint = this.hingeJoint

        quat.multiply(quat.conjugate(femur.rotation, femur.inverseBind), bind0, femur.inverseBind)
        quat.multiply(quat.conjugate(tibia.rotation, tibia.inverseBind), bind1, tibia.inverseBind)
        vec3.copy(joint2, chain.target)

        this.targets.push({
            world: mat4.transform(chain.target, this.mesh.transform.matrix, vec3()),
            local: chain.target,
            center: vec3.copy(chain.target, vec3()),
            delta: vec3(), radius: 0.2, moving: false
        })

        return chain
    }
    build(mesh: Mesh){
        this.mesh = mesh
        mesh.armature.update(this.context)
        mesh.transform.recalculate(this.context.frame)

        this.attachLimb(mesh.armature.nodes[1], mesh.armature.nodes[2])
        this.attachLimb(mesh.armature.nodes[3], mesh.armature.nodes[4])
        this.attachLimb(mesh.armature.nodes[5], mesh.armature.nodes[6])
        this.attachLimb(mesh.armature.nodes[7], mesh.armature.nodes[8])
    }
    *moveTarget(target: { world: vec3, moving: boolean }, next: vec3): Generator<ActionSignal> {
        target.moving = true
        const prev = vec3.copy(target.world, vec3()), height = 0.5
        for(const duration = 0.1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            let t = Math.min(1, elapsedTime / duration)
            target.world[0] = lerp(prev[0], next[0], ease.sineInOut(t))
            target.world[1] = lerp(prev[1], next[1], ease.slowInOut(t)) + height * ease.fadeInOut(t)
            target.world[2] = lerp(prev[2], next[2], ease.sineInOut(t))
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        target.moving = false
    }
    update(){
        mat4.invert(this.mesh.transform.matrix, this.inverseModelMatrix)

        let maxDistance = 0, targetIndex = -1, moving = 0
        for(let i = this.targets.length - 1; i >= 0; i--){
            const target = this.targets[i]
            mat4.transform(target.world, this.inverseModelMatrix, target.local)
            moving += +target.moving
            if(target.moving) continue

            vec3.subtract(target.local, target.center, target.delta)
            vec3.projectPlane(target.delta, vec3.AXIS_Y, target.delta)
            const distance = vec3.magnitudeSquared(target.delta)
            if(distance <= target.radius * target.radius) continue
            else if(maxDistance >= distance) continue

            maxDistance = distance
            targetIndex = i
        }
        if(targetIndex != -1 && moving == 0){
            maxDistance = Math.sqrt(maxDistance)
            const target = this.targets[targetIndex]
            vec3.scale(target.delta, -Math.min(target.radius, maxDistance-target.radius) / maxDistance, target.delta)
            const next = vec3.add(target.center, target.delta, vec3())
            mat4.transform(next, this.mesh.transform.matrix, next)

            this.context.get(TerrainSystem).snapToGround(next)
            this.context.get(AnimationSystem).start(this.moveTarget(target, next), true)
        }

        super.update()

        for(let i = this.chains.length - 1; i >= 0; i--)
        for(let j = 0; j < this.chains[i].bones.length; j++){
            const bone = this.chains[i].bones[j]
            if(bone.index == -1) continue
            const node = this.mesh.armature.nodes[bone.index]

            quat.multiply(bone.rotation, bone.inverseBind, this.worldOrientation)
            mat4.fromRotationTranslationScale(this.worldOrientation, bone.start, vec3.ONE, node.globalTransform)
            this.mesh.armature.updateBone(bone.index)
        }
    }
}