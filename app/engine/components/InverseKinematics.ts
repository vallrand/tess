import { clamp, vec3, quat, vec4, mat4 } from '../math'

interface IJointConstraint {
    apply(bone: IKBone, parent: IKBone, out: quat): void
}

export class SwingTwistConstraint implements IJointConstraint {
    private readonly localRotation: quat = quat()
    private readonly twist: quat = quat()
    private readonly swing: quat = quat()
    swingAngle: number = Math.PI
    twistAngle: number = 0 * Math.PI
    apply(bone: IKBone, parent: IKBone, out: quat): void {
        quat.conjugate(parent?.rotation || quat.IDENTITY, this.localRotation)
        quat.multiply(this.localRotation, out, this.localRotation)

        quat.decompose(this.localRotation, IKBone.FORWARD, this.swing, this.twist)
        this.limitRotation(this.swing, this.swingAngle)
        this.limitRotation(this.twist, this.twistAngle)
        quat.multiply(this.swing, this.twist, this.localRotation)

        quat.multiply(parent?.rotation || quat.IDENTITY, this.localRotation, out)
        quat.normalize(out, out)
    }
    private limitRotation(quaternion: quat | vec3, angle: number){
        const magnitude = Math.sin(0.5 * angle)
        const squareMagnitude = magnitude * magnitude
        if(vec3.magnitudeSquared(quaternion as vec3) <= squareMagnitude) return
        vec3.normalize(quaternion as vec3, quaternion as vec3)
        vec3.scale(quaternion as vec3, magnitude, quaternion as vec3)
        quaternion[3] = Math.sqrt(1 - squareMagnitude) * (quaternion[3] < 0 ? -1 : 1)
    }
}

export class BallJointConstraint implements IJointConstraint {
    private readonly localRotation: quat = quat()
    private readonly localDirection: vec3 = vec3()
    rotor: number = Math.PI
    readonly axis: vec3 = vec3.copy(IKBone.FORWARD, vec3())
    apply(bone: IKBone, parent: IKBone, out: quat): void {
        quat.conjugate(parent?.rotation || quat.IDENTITY, this.localRotation)
        quat.multiply(this.localRotation, out, this.localRotation)

        quat.transform(IKBone.FORWARD, this.localRotation, this.localDirection)
        const angle = vec3.angle(this.axis, this.localDirection)
        if(angle < Number.EPSILON) quat.copy(quat.IDENTITY, this.localRotation)
        else{
            const correctionAxis = vec3.cross(IKBone.FORWARD, this.localDirection, this.localDirection)
            vec3.normalize(correctionAxis, correctionAxis)
            quat.axisAngle(correctionAxis, clamp(angle, 0, this.rotor), this.localRotation)
        }
        
        quat.multiply(parent?.rotation || quat.IDENTITY, this.localRotation, out)
        quat.normalize(out, out)
    }
}

export class LocalHingeConstraint implements IJointConstraint {
    private readonly localRotation: quat = quat()
    private readonly localDirection: vec3 = vec3()
    private readonly referenceAxis: vec3 = vec3()
    private readonly projectedDirection: vec3 = vec3()
    min: number = -Math.PI
    max: number = Math.PI
    readonly axis: vec3 = vec3.copy(IKBone.LEFT, vec3())
    apply(bone: IKBone, parent: IKBone, out: quat): void {
        quat.conjugate(parent?.rotation || quat.IDENTITY, this.localRotation)
        quat.multiply(this.localRotation, out, this.localRotation)

		quat.transform(IKBone.FORWARD, this.localRotation, this.localDirection)
		this.limitAxis(this.axis, this.localDirection, this.min, this.max, this.localRotation)

        quat.multiply(parent?.rotation || quat.IDENTITY, this.localRotation, out)
        quat.normalize(out, out)
    }
    limitAxis(axis: vec3, direction: vec3, min: number, max: number, out: quat){
        const projected = vec3.projectPlane(direction, axis, this.projectedDirection)
        if(vec3.dot(projected, projected) < Number.EPSILON) return quat.copy(quat.IDENTITY, out)
        const referenceAxis = vec3.projectPlane(IKBone.FORWARD, axis, this.referenceAxis)
        const angle = vec3.angle(projected, referenceAxis)
        const sign = vec3.dot(axis, vec3.cross(referenceAxis, projected, projected)) < 0 ? -1 : 1
        quat.axisAngle(axis, clamp(angle * sign, min, max), out)
    }
}

export class IKBone {
    public static readonly UP = vec3.AXIS_Y
    public static readonly FORWARD = vec3.AXIS_Z
    public static readonly LEFT = vec3.AXIS_X
    joint: IJointConstraint
    readonly start: vec3 = vec3()
    readonly end: vec3 = vec3()
    readonly direction: vec3 = vec3()
    readonly rotation: quat = quat()
    readonly inverseBind: quat = quat()
    index: number = -1
    length: number = 0
    set(start: vec3, end: vec3){
        vec3.copy(start, this.start)
        vec3.copy(end, this.end)
        this.length = vec3.distance(this.start, this.end)

        vec3.subtract(this.end, this.start, this.direction)
        vec3.normalize(this.direction, this.direction)

        quat.fromNormal(this.direction, IKBone.UP, this.rotation)
        quat.normalize(this.rotation, this.rotation)
    }
}

export class IKChain {
    private static readonly direction: vec3 = vec3()
    private static readonly rotation: quat = quat()
    private static readonly temp: quat = quat()
    private buffer: Float32Array = new Float32Array(0)
    readonly bones: IKBone[] = []
    length: number = 0
    parent: IKBone
    readonly origin: vec3 = vec3()
    target: vec3 = vec3()
    readonly lastOrigin: vec3 = vec3()
    readonly lastTarget: vec3 = vec3()

    get first(): IKBone { return this.bones[0] }
    get last(): IKBone { return this.bones[this.bones.length - 1] }
    add(position: vec3): IKBone {
        const bone = new IKBone()
        bone.set(this.last ? this.last.end : this.origin, position)
        this.bones.push(bone)
        this.length += bone.length
        return bone
    }
    remove(bone: IKBone): void {
        const index = this.bones.indexOf(bone)
        if(index == -1) return
        this.length -= bone.length
        this.bones.splice(index, 1)
    }
    solveFABRIK(): number {
        const { target, parent } = this
        const { direction, rotation } = IKChain
        if(target != null)
        forward: for(let joint = target, i = this.bones.length - 1; i >= 0; i--){
            const bone = this.bones[i]
            vec3.copy(joint, bone.end)

            vec3.subtract(bone.end, bone.start, direction)
            vec3.normalize(direction, direction)

            quat.unitRotation(bone.direction, direction, rotation)
            quat.multiply(rotation, bone.rotation, bone.rotation)
            quat.normalize(bone.rotation, bone.rotation)

            if(i < this.bones.length - 1){
                const nextBone = this.bones[i + 1]
                nextBone.joint.apply(nextBone, bone, quat.copy(nextBone.rotation, rotation))
                const delta = quat.conjugate(rotation, rotation)
                quat.multiply(delta, nextBone.rotation, delta)
                quat.multiply(delta, bone.rotation, bone.rotation)
                quat.normalize(bone.rotation, bone.rotation)
            }
			
			quat.transform(IKBone.FORWARD, bone.rotation, bone.direction)
            vec3.scale(bone.direction, -bone.length, bone.start)
            joint = vec3.add(bone.end, bone.start, bone.start)
        }
        backward: for(let joint = parent ? parent.end : this.first.start, i = 0; i < this.bones.length; i++){
            const bone = this.bones[i]
            vec3.copy(joint, bone.start)

            vec3.subtract(bone.end, bone.start, direction)
            vec3.normalize(direction, direction)

            quat.unitRotation(bone.direction, direction, rotation)
            quat.multiply(rotation, bone.rotation, bone.rotation)
            quat.normalize(bone.rotation, bone.rotation)

			bone.joint.apply(bone, this.bones[i - 1] || parent, bone.rotation)
			
			quat.transform(IKBone.FORWARD, bone.rotation, bone.direction)
            vec3.scale(bone.direction, bone.length, bone.end)
            joint = vec3.add(bone.start, bone.end, bone.end)
        }
        return target ? vec3.distance(this.last.end, target) : 0
    }
    solveCCD(){
        const { target, parent } = this
        const { direction, rotation, temp } = IKChain
        for(let i = this.bones.length - 1; i >= 0; i--){
            const bone = this.bones[i]

            const from = vec3.subtract(this.last.end, bone.start, direction)
            const to = vec3.subtract(target, bone.start, bone.direction)

            const angle = vec3.angle(from, to)
            const axis = vec3.cross(from, to, direction)
            vec3.normalize(axis, axis)
            quat.axisAngle(axis, angle, rotation)

            quat.multiply(rotation, bone.rotation, rotation)
            quat.normalize(rotation, rotation)
            bone.joint.apply(bone, this.bones[i - 1] || parent, rotation)

            quat.multiply(rotation, quat.conjugate(bone.rotation, temp), rotation)

            for(let j = i, joint = bone.start; j < this.bones.length; j++){
                const bone = this.bones[j]
                vec3.copy(joint, bone.start)

                quat.multiply(rotation, bone.rotation, bone.rotation)
                quat.normalize(bone.rotation, bone.rotation)

                quat.transform(IKBone.FORWARD, bone.rotation, bone.direction)
                vec3.scale(bone.direction, bone.length, bone.end)
                joint = vec3.add(bone.start, bone.end, bone.end)
            }
        }
        return vec3.distance(this.last.end, target)
    }
    serialize(): Float32Array {
        if(this.buffer.length != this.bones.length * 4 + 4)
            this.buffer = new Float32Array(this.bones.length * 4 + 4)
        this.buffer.set(this.first.start, 0)
        for(let i = 0; i < this.bones.length; i++)
            this.buffer.set(this.bones[i].rotation, 4 + i * 4)
        return this.buffer
    }
    deserialize(buffer: Float32Array){
        for(let joint: vec3 = buffer as any, i = 0; i < this.bones.length; i++){
            const bone = this.bones[i], index = 4 + i * 4
            quat.set(buffer[index + 0], buffer[index + 1], buffer[index + 2], buffer[index + 3], bone.rotation)
            vec3.copy(joint, bone.start)
            quat.transform(IKBone.FORWARD, bone.rotation, bone.direction)
            vec3.scale(bone.direction, bone.length, bone.end)
            joint = vec3.add(bone.start, bone.end, bone.end)
        }
    }
}

export class IKRig {
    readonly chains: IKChain[] = []
    private precision: number = 1e-6
    private iterations: number = 16
    private distanceThreshold: number = 0.1
    private deltaDistanceThreshold: number = 1e-3
    protected mode: number = 0
    enabled: boolean = true

    update(){
        if(!this.enabled) return
        for(let i = this.chains.length - 1; i >= 0; i--){
            const chain = this.chains[i]
            const origin = chain.parent ? chain.parent.end : chain.origin
            const target = chain.target || vec3.ZERO
            if(vec3.equals(origin, chain.lastOrigin, this.precision) &&
            vec3.equals(target, chain.lastTarget, this.precision)) continue
            vec3.copy(origin, chain.lastOrigin)
            vec3.copy(target, chain.lastTarget)
            
            chain.deserialize(this.solve(chain))
        }
    }
    private solve(chain: IKChain): Float32Array {
        let solution: Float32Array, minDistance = Infinity, lastDistance = Infinity
        for(let i = this.iterations; i > 0; i--){
            const distance = this.mode ? chain.solveFABRIK() : chain.solveCCD()
            if(distance < minDistance){
                minDistance = distance
                solution = chain.serialize()
                if(minDistance <= this.distanceThreshold) break
            }else if(Math.abs(distance - lastDistance) < this.deltaDistanceThreshold) break
            lastDistance = distance
        }
        return solution
    }
    add(origin: vec3, parent?: IKBone): IKChain {
        const chain = new IKChain()
        vec3.copy(origin, chain.origin)
        chain.parent = parent
        this.chains.push(chain)
        return chain
    }
    remove(chain: IKChain): void {
        const index = this.chains.indexOf(chain)
        this.chains.splice(index, 1)
    }
}