import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4, ease } from '../../engine/math'
import { IKRig, IKBone, SwingTwistConstraint, ArmatureNode } from '../../engine/components'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType } from '../../engine/components'
import { AnimationSystem, ActionSignal, TransformSystem } from '../../engine/scene'
import { ParticleEmitter, GradientRamp } from '../../engine/particles'
import { PropertyAnimation, AnimationTimeline, BlendTween, IAnimationTween, EmitterTrigger } from '../../engine/scene/Animation'
import { ParticleEffectPass } from '../../engine/pipeline'
import { SpriteMaterial, EffectMaterial } from '../../engine/materials'
import { createCylinder, applyTransform, doubleSided } from '../../engine/geometry'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

class SnakeRig extends IKRig {
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

function WavyTween(options: {
    amplitude: vec3
    frequency: vec3
}, blend: (prev: vec3, next: vec3, out: vec3) => vec3): IAnimationTween<vec3> {
    const { amplitude, frequency } = options
    const offset = vec3()
    return function(elapsed: number, target: vec3): vec3 {
        offset[0] = amplitude[0] * Math.cos(this.context.currentTime * frequency[0]) * elapsed
        offset[1] = amplitude[1] * Math.cos(this.context.currentTime * frequency[1]) * elapsed
        offset[2] = amplitude[2] * Math.cos(this.context.currentTime * frequency[2]) * elapsed
        return blend(offset, target, target)
    }
}

function LookAtTween(tween: IAnimationTween<vec3>): IAnimationTween<quat> {
    const normal = vec3(), rotation = quat()
    return function(elapsed: number, target: quat): quat {
        tween.call(this, elapsed, normal)
        normal[2] += 2
        vec3.normalize(normal, normal)
        quat.unitRotation(vec3.AXIS_Z, normal, rotation)
        return quat.multiply(target, rotation, target)
    }
}

export class Stingray extends ControlUnit {
    private static readonly model: string = 'stingray'
    private mesh: Mesh

    private spikesLeft: ParticleEmitter
    private spikesRight: ParticleEmitter
    private tubeLeft: BatchMesh
    private tubeRight: BatchMesh
    private beamLeft: Sprite
    private beamRight: Sprite
    private ringLeft: Sprite
    private ringRight: Sprite
    private sparksLeft: ParticleEmitter
    private sparksRight: ParticleEmitter
    private wave: BatchMesh
    private cone: BatchMesh

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Stingray.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Stingray.model].activate(0, this.mesh.armature)

        const rig = new SnakeRig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public disappear(): Generator<ActionSignal> {
        this.mesh.armature.ik.enabled = false
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'mesh.transform.position': WavyTween({
                amplitude: [0,0.1,0],
                frequency: [0,7.1,0]
            }, vec3.add),
            'mesh.transform.rotation': LookAtTween(WavyTween({
                amplitude: [0.2,0.2,0],
                frequency: [6.3,7.1,0]
            }, vec3.copy))
        })
        
        const floatDuration = 0.4
        const duration = path.length * floatDuration + 2 * floatDuration

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, true),
        startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)
            animate(floatTime, this.context.deltaTime)

            if(iterator.done) break
            else yield iterator.value
        }
    }
    public *strike(target: vec3): Generator<ActionSignal> {
        this.spikesLeft = SharedSystem.particles.energy.add({
            uLifespan: [0.8,1.2,0,0],
            uOrigin: mat4.transform(vec3(0.5,1.5,-0.5), this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO, uGravity: vec3.ZERO,
            uSize: [0.4,1.2], uRadius: [0.5,1.5], uForce: [6,8],
            uTarget: mat4.transform(vec3(0.5,1,3), this.mesh.transform.matrix, vec3()),
        })
        this.spikesRight = SharedSystem.particles.energy.add({
            uLifespan: [0.8,1.2,0,0],
            uOrigin: mat4.transform(vec3(-0.5,1.5,-0.5), this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO, uGravity: vec3.ZERO,
            uSize: [0.4,1.2], uRadius: [0.5,1.5], uForce: [6,8],
            uTarget: mat4.transform(vec3(-0.5,1,3), this.mesh.transform.matrix, vec3()),
        })

        this.tubeLeft = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.tubeRight = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)

        this.tubeLeft.material = SharedSystem.materials.absorbTealMaterial
        this.tubeRight.material = SharedSystem.materials.absorbTealMaterial

        this.tubeLeft.transform = this.context.get(TransformSystem).create()
        this.tubeLeft.transform.parent = this.mesh.transform
        vec3.set(0.5,1.3,1.2, this.tubeLeft.transform.position)
        quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, this.tubeLeft.transform.rotation)

        this.tubeRight.transform = this.context.get(TransformSystem).create()
        this.tubeRight.transform.parent = this.mesh.transform
        vec3.set(-0.5,1.3,1.2, this.tubeRight.transform.position)
        quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, this.tubeRight.transform.rotation)

        this.context.get(ParticleEffectPass).add(this.tubeLeft)
        this.context.get(ParticleEffectPass).add(this.tubeRight)


        const beamMaterial = new SpriteMaterial()
        beamMaterial.program = this.context.get(ParticleEffectPass).program
        beamMaterial.diffuse = SharedSystem.textures.sparkle

        this.beamLeft = new Sprite()
        this.beamRight = new Sprite()
        this.beamLeft.billboard = BillboardType.Cylinder
        this.beamRight.billboard = BillboardType.Cylinder
        this.beamLeft.material = beamMaterial
        this.beamRight.material = beamMaterial
        this.beamLeft.transform = this.context.get(TransformSystem).create()
        this.beamRight.transform = this.context.get(TransformSystem).create()
        this.beamLeft.transform.parent = this.mesh.transform
        this.beamRight.transform.parent = this.mesh.transform

        this.beamRight.order = 4
        this.beamLeft.order = 4

        quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, this.beamLeft.transform.rotation)
        vec3.set(-0.5,1.3,3, this.beamLeft.transform.position)
        quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, this.beamRight.transform.rotation)
        vec3.set(0.5,1.3,3, this.beamRight.transform.position)

        this.context.get(ParticleEffectPass).add(this.beamLeft)
        this.context.get(ParticleEffectPass).add(this.beamRight)


        this.ringLeft = new Sprite()
        this.ringRight = new Sprite()
        this.ringLeft.billboard = BillboardType.Sphere
        this.ringRight.billboard = BillboardType.Sphere

        const ringMaterial = new SpriteMaterial()
        ringMaterial.program = this.context.get(ParticleEffectPass).program
        ringMaterial.diffuse = SharedSystem.textures.raysInner

        this.ringLeft.material = ringMaterial
        this.ringRight.material = ringMaterial

        this.ringLeft.transform = this.context.get(TransformSystem)
        .create(vec3(-0.5,1.3,3), quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.ringRight.transform = this.context.get(TransformSystem)
        .create(vec3(0.5,1.3,3), quat.IDENTITY, vec3.ONE, this.mesh.transform)

        this.context.get(ParticleEffectPass).add(this.ringLeft)
        this.context.get(ParticleEffectPass).add(this.ringRight)

        this.ringRight.order = 4
        this.ringLeft.order = 4

        this.sparksLeft = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.6,-0.15,0],
            uOrigin: mat4.transform(vec3(-0.5,1.3,3), this.mesh.transform.matrix, vec3()),
            uGravity: [0,-4,0],
            uLength: [0.2,0.3],
            uSize: [0.2,0.4],
            uForce: [2,5],
            uRadius: [0,0.1],
            uTarget: mat4.transform(vec3(-0.5,1.3,3), this.mesh.transform.matrix, vec3()),
        })
        this.sparksRight = SharedSystem.particles.sparks.add({
            uLifespan: [0.4,0.6,-0.15,0],
            uOrigin: mat4.transform(vec3(0.5,1.3,3), this.mesh.transform.matrix, vec3()),
            uGravity: [0,-4,0],
            uLength: [0.2,0.3],
            uSize: [0.2,0.4],
            uForce: [2,5],
            uRadius: [0,0.1],
            uTarget: mat4.transform(vec3(0.5,1.3,3), this.mesh.transform.matrix, vec3()),
        })

        this.wave = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.wave.material = SharedSystem.materials.stripesMaterial
        this.wave.transform = this.context.get(TransformSystem)
        .create(vec3(0,1.3,3), quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, quat()), vec3.ONE, this.mesh.transform)

        this.context.get(ParticleEffectPass).add(this.wave)

        this.cone = new BatchMesh(SharedSystem.geometry.cone)
        this.cone.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, Sprite.FlatUp, vec3.ONE, this.mesh.transform)

        this.cone.material = new SpriteMaterial()
        this.cone.material.diffuse = SharedSystem.textures.raysWrap
        this.cone.material.program = this.context.get(ParticleEffectPass).program
        this.context.get(ParticleEffectPass).add(this.cone)

        const animate = AnimationTimeline(this, {
            'cone.transform.position': PropertyAnimation([
                { frame: 0.7, value: [0,1.5,0.5] },
                { frame: 1.1, value: [0,1.3,3.5], ease: ease.quintOut }
            ], vec3.lerp),
            'cone.transform.scale': PropertyAnimation([
                { frame: 0.8, value: [1.5,6,1.5] },
                { frame: 1.1, value: [1,0.8,1], ease: ease.quadOut }
            ], vec3.lerp),
            'cone.color': PropertyAnimation([
                { frame: 0.7, value: vec4.ZERO },
                { frame: 0.8, value: [0.6,0.7,0.9,0.4], ease: ease.quartOut },
                { frame: 1.1, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),

            'mesh.armature': modelAnimations[Stingray.model].activate,
            'spikesLeft': EmitterTrigger({ frame: 0.16, value: 24 }),
            'spikesRight': EmitterTrigger({ frame: 0.16, value: 24 }),
            'sparksLeft': EmitterTrigger({ frame: 0.8, value: 36 }),
            'sparksRight': EmitterTrigger({ frame: 0.8, value: 36 }),
            'wave.transform.scale': PropertyAnimation([
                { frame: 1.0, value: [1,0,0] },
                { frame: 1.7, value: [2,2,1.5], ease: ease.sineOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 1.0, value: [0.4,0.2,1,1] },
                { frame: 1.7, value: vec4.ZERO, ease: ease.sineInOut }
            ], vec4.lerp),
            'tubeLeft.transform.scale': PropertyAnimation([
                { frame: 0.8, value: [2.4,0,2.4] },
                { frame: 1.0, value: [0.6,2,0.6], ease: ease.quadOut },
                { frame: 1.6, value: [0,2,0], ease: ease.sineIn }
            ], vec3.lerp),
            'tubeRight.transform.scale': PropertyAnimation([
                { frame: 0.8, value: [2.4,0,2.4] },
                { frame: 1.0, value: [0.6,2,0.6], ease: ease.quadOut },
                { frame: 1.6, value: [0,2,0], ease: ease.sineIn }
            ], vec3.lerp),
            'tubeLeft.color': PropertyAnimation([
                { frame: 1.0, value: vec4.ONE },
                { frame: 1.6, value: [0.4,0,0.6,1], ease: ease.quadIn }
            ], vec4.lerp),
            'tubeRight.color': PropertyAnimation([
                { frame: 1.0, value: vec4.ONE },
                { frame: 1.6, value: [0.4,0,0.6,1], ease: ease.quadIn }
            ], vec4.lerp),
            'beamLeft.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.2, value: [1.6,4.8,1.6], ease: ease.expoOut }
            ], vec3.lerp),
            'beamRight.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.2, value: [1.6,4.8,1.6], ease: ease.expoOut }
            ], vec3.lerp),
            'beamLeft.color': PropertyAnimation([
                { frame: 0.8, value: [0.7,0.9,1,0] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.cubicIn }
            ], vec4.lerp),
            'beamRight.color': PropertyAnimation([
                { frame: 0.8, value: [0.7,0.9,1,0] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.cubicIn }
            ], vec4.lerp),
            'ringLeft.transform.scale': PropertyAnimation([
                { frame: 0.9, value: vec3.ZERO },
                { frame: 1.3, value: [2,2,2], ease: ease.quartOut }
            ], vec3.lerp),
            'ringRight.transform.scale': PropertyAnimation([
                { frame: 0.9, value: vec3.ZERO },
                { frame: 1.3, value: [2,2,2], ease: ease.quartOut }
            ], vec3.lerp),
            'ringLeft.color': PropertyAnimation([
                { frame: 0.9, value: [0.4,0.6,1,0.2] },
                { frame: 1.3, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'ringRight.color': PropertyAnimation([
                { frame: 0.9, value: [0.4,0.6,1,0.2] },
                { frame: 1.3, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp)
        })

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.energy.remove(this.spikesLeft)
        SharedSystem.particles.energy.remove(this.spikesRight)
        SharedSystem.particles.sparks.remove(this.sparksLeft)
        SharedSystem.particles.sparks.remove(this.sparksRight)

        this.context.get(TransformSystem).delete(this.ringLeft.transform)
        this.context.get(TransformSystem).delete(this.ringRight.transform)
        this.context.get(TransformSystem).delete(this.tubeLeft.transform)
        this.context.get(TransformSystem).delete(this.tubeRight.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.beamLeft.transform)
        this.context.get(TransformSystem).delete(this.beamRight.transform)
        this.context.get(TransformSystem).delete(this.cone.transform)

        this.context.get(ParticleEffectPass).remove(this.ringLeft)
        this.context.get(ParticleEffectPass).remove(this.ringRight)
        this.context.get(ParticleEffectPass).remove(this.tubeLeft)
        this.context.get(ParticleEffectPass).remove(this.tubeRight)
        this.context.get(ParticleEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.beamLeft)
        this.context.get(ParticleEffectPass).remove(this.beamRight)
        this.context.get(ParticleEffectPass).remove(this.cone)
    }
}