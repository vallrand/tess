import { Application } from '../../engine/framework'
import { random, clamp, lerp, vec2, vec3, vec4, quat, mat4, ease } from '../../engine/math'
import { IKRig, IKBone, LocalHingeConstraint, BallJointConstraint } from '../../engine/components/InverseKinematics'
import { MeshSystem, Mesh, ArmatureNode, Sprite, BillboardType, BatchMesh, Line } from '../../engine/components'
import { MeshMaterial, SpriteMaterial, DecalMaterial } from '../../engine/materials'
import { AnimationSystem, ActionSignal, TransformSystem } from '../../engine/scene'
import { applyTransform, doubleSided } from '../../engine/geometry'
import { ParticleEmitter, GradientRamp } from '../../engine/particles'
import { DeferredGeometryPass, PointLightPass, PointLight, DecalPass, Decal, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'
import { PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger, FollowPath } from '../../engine/scene'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'

class Spider4Rig extends IKRig {
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

export class Tarantula extends ControlUnit {
    private static readonly model: string = 'tarantula'
    private mesh: Mesh

    private beam: Sprite
    private cracks: Decal
    private wave: Sprite
    private ring: Sprite
    private cylinder: BatchMesh
    private pillar: BatchMesh
    private bolts: ParticleEmitter
    private light: PointLight
    private core: BatchMesh
    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Tarantula.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Tarantula.model].activate(0, this.mesh.armature)

        const rig = new Spider4Rig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        
        const animate = AnimationTimeline(this, {
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.5,0], ease: ease.sineOut }
            ], BlendTween.vec3)
        })
        
        const floatDuration = 0.8
        const duration = path.length * floatDuration + 2 * floatDuration

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, false), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)
            animate(floatTime, this.context.deltaTime)

            if(iterator.done) break
            else yield iterator.value
        }
    }
    public *strike(target: vec2): Generator<ActionSignal> {
        this.beam = new Sprite()
        this.beam.billboard = BillboardType.Cylinder
        vec2.set(0,0.5,this.beam.origin)
        this.beam.material = new SpriteMaterial()
        this.beam.material.program = this.context.get(ParticleEffectPass).program
        this.beam.material.diffuse = SharedSystem.textures.raysBeam
        this.beam.transform = this.context.get(TransformSystem)
        .create([0,0,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.beam)

        this.cracks = this.context.get(DecalPass).create(4)
        this.cracks.material = new DecalMaterial()
        this.cracks.material.program = this.context.get(DecalPass).program
        this.cracks.material.diffuse = SharedSystem.textures.cracks
        this.cracks.material.normal = SharedSystem.textures.cracksNormal
        this.cracks.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.mesh.transform)

        this.wave = new Sprite()
        this.wave.billboard = BillboardType.None
        this.wave.material = new SpriteMaterial()
        this.wave.material.blendMode = null
        this.wave.material.program = SharedSystem.materials.distortion
        this.wave.material.diffuse = SharedSystem.textures.ring
        this.wave.transform = this.context.get(TransformSystem)
        .create([0,1,0], Sprite.FlatUp, vec3.ONE, this.mesh.transform)
        this.context.get(PostEffectPass).add(this.wave)

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.None
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,0.5,0], Sprite.FlatUp, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.cylinder = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = SharedSystem.materials.stripesMaterial
        this.cylinder.transform = this.context.get(TransformSystem)
        .create([0,2,0], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)

        this.pillar = new BatchMesh(SharedSystem.geometry.lopolyCylinderFlip)
        this.pillar.material = new SpriteMaterial()
        this.pillar.material.program = this.context.get(ParticleEffectPass).program
        this.pillar.material.diffuse = SharedSystem.textures.raysWrap
        this.pillar.transform = this.context.get(TransformSystem)
        .create([0,0,0], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.bolts = SharedSystem.particles.bolts.add({
            uOrigin: vec3.add([0,1,0], this.mesh.transform.position, vec3()),
            uRadius: [2,4],
            uLifespan: [0.2,0.8,-0.4,0],
            uGravity: vec3.ZERO,
            uRotation: [0,2*Math.PI],
            uOrientation: quat.IDENTITY,
            uSize: [0.4,1.6],
            uFrame: [16,4]
        })

        this.light = this.context.get(PointLightPass).create([0.7,0.6,1])
        this.light.transform = this.context.get(TransformSystem)
        .create([0,4,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)

        this.core = new BatchMesh(doubleSided(SharedSystem.geometry.lowpolySphere))
        this.core.material = SharedSystem.materials.energyPurpleMaterial
        this.core.transform = this.context.get(TransformSystem)
        .create([0,1,0],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.core)

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[Tarantula.model].activate,

            'core.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.5, value: [4,-4,4], ease: ease.quadOut }
            ], vec3.lerp),
            'core.color': PropertyAnimation([
                { frame: 0.8, value: [0.6,0.8,1,0.4] },
                { frame: 1.5, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'light.radius': PropertyAnimation([
                { frame: 0.6, value: 0 },
                { frame: 1.4, value: 8, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0.6, value: 8 },
                { frame: 1.4, value: 0, ease: ease.quadIn }
            ], lerp),
            'bolts': EventTrigger([
                { frame: 0.8, value: 48 }
            ], EventTrigger.emit),

            'beam.transform.scale': PropertyAnimation([
                { frame: 0.7, value: vec3.ZERO },
                { frame: 1.2, value: [3,8,3], ease: ease.cubicOut }
            ], vec3.lerp),
            'beam.color': PropertyAnimation([
                { frame: 0.7, value: [0.6,0.6,1,0.4] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'cracks.transform.rotation': EventTrigger([
                { frame: 0, value: null }
            ], (rotation: quat) => quat.axisAngle(vec3.AXIS_Y, 2*Math.PI*random(), rotation)),
            'cracks.transform.scale': PropertyAnimation([
                { frame: 0.8, value: [12,4,12] }
            ], vec3.lerp),
            'cracks.color': PropertyAnimation([
                { frame: 0.8, value: [0.6,0.6,1,1] }
            ], vec4.lerp),
            'cracks.threshold': PropertyAnimation([
                { frame: 0.8, value: -3 },
                { frame: 1.0, value: 0, ease: ease.quadOut },
                { frame: 2.0, value: 3, ease: ease.quartIn }
            ], lerp),
            'wave.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.4, value: [10,10,10], ease: ease.cubicOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 0.8, value: vec4.ONE },
                { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'ring.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.4, value: [10,10,10], ease: ease.quartOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.8, value: [0.6,0.4,1,0] },
                { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'cylinder.transform.scale': PropertyAnimation([
                { frame: 0.4, value: [4,1,4] },
                { frame: 1.0, value: [0,6,0], ease: ease.sineOut }
            ], vec3.lerp),
            'cylinder.color': PropertyAnimation([
                { frame: 0.4, value: vec4.ZERO },
                { frame: 1.0, value: [0.4,0.2,1,1], ease: ease.cubicOut },
            ], vec4.lerp),
            'pillar.transform.scale': PropertyAnimation([
                { frame: 0.8, value: [0,-8,0] },
                { frame: 1.4, value: [5,-2,5], ease: ease.cubicOut }
            ], vec3.lerp),
            'pillar.color': PropertyAnimation([
                { frame: 0.8, value: [0.8,0.6,1,0.4] },
                { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp)
        })

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.beam.transform)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(TransformSystem).delete(this.cylinder.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.cracks.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.core.transform)

        SharedSystem.particles.bolts.remove(this.bolts)
        this.context.get(DecalPass).delete(this.cracks)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(PostEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.beam)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.core)
    }
}

export class TarantulaVariant extends ControlUnit {
    private static readonly model: string = 'tarantula'
    private mesh: Mesh

    private ring: Sprite
    private flash: Sprite
    private pillar: BatchMesh
    private muzzle: BatchMesh
    private fire: ParticleEmitter
    private light: PointLight
    private trail: Line
    private core: BatchMesh
    private wave: Sprite
    private circle: Sprite

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(TarantulaVariant.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[TarantulaVariant.model].activateVariant(0, this.mesh.armature)

        const rig = new Spider4Rig(this.context)
        rig.build(this.mesh)
        this.mesh.armature.ik = rig
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'mesh.transform.position': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 1, value: [0,0.5,0], ease: ease.sineOut }
            ], BlendTween.vec3)
        })
        
        const floatDuration = 0.8
        const duration = path.length * floatDuration + 2 * floatDuration

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, false), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime
            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)
            animate(floatTime, this.context.deltaTime)

            if(iterator.done) break
            else yield iterator.value
        }
    }
    public strike(target: vec2): Generator<ActionSignal> {
        return this.launch(vec2.add(this.tile, [-4,0], vec2()))
    }
    private *launch(target: vec2): Generator<ActionSignal> {
        const orientation = quat.axisAngle(vec3.AXIS_Y, Math.atan2(target[0] - this.tile[0], target[1] - this.tile[1]), quat())
        const transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, orientation, vec3.ONE, this.mesh.transform)

        this.pillar = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.pillar.material = SharedSystem.materials.stripesRedMaterial
        this.pillar.transform = this.context.get(TransformSystem)
        .create([0,1.8,0], Sprite.FlatUp, vec3.ONE, transform)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.muzzle = new BatchMesh(SharedSystem.geometry.cone)
        this.muzzle.material = new SpriteMaterial()
        this.muzzle.material.program = this.context.get(ParticleEffectPass).program
        this.muzzle.material.diffuse = SharedSystem.textures.raysWrap
        this.muzzle.transform = this.context.get(TransformSystem)
        .create([0,1.8,1.2],Sprite.FlatUp,vec3.ONE,transform)
        this.context.get(ParticleEffectPass).add(this.muzzle)

        this.flash = new Sprite()
        this.flash.billboard = BillboardType.None
        this.flash.material = SharedSystem.materials.flashYellowMaterial
        this.flash.transform = this.context.get(TransformSystem)
        .create([0,1.8,1.8],quat.IDENTITY,vec3.ONE,transform)
        this.context.get(ParticleEffectPass).add(this.flash)

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.None
        this.ring.material = new SpriteMaterial()
        this.ring.material.program = this.context.get(ParticleEffectPass).program
        this.ring.material.diffuse = SharedSystem.textures.swirl
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,1.8,2],quat.IDENTITY,vec3.ONE,transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        this.trail = new Line(8)
        this.trail.width = 0.8
        this.trail.ease = ease.reverse(ease.quadIn)
        this.trail.addColorFade(this.trail.ease)
        this.trail.material = new SpriteMaterial()
        this.trail.material.program = this.context.get(ParticleEffectPass).program
        this.trail.material.diffuse = GradientRamp(this.context.gl, [
            0x00000000, 0x04467840, 0x21ccaa20, 0xc9f2e600, 0x21ccaa20, 0x04467840, 0x00000000
        ], 1)
        this.context.get(ParticleEffectPass).add(this.trail)

        const originPosition = mat4.transform([0,1.8,0], this.mesh.transform.matrix, vec3())
        const targetPosition = this.context.get(TerrainSystem).tilePosition(target[0], target[1], vec3())

        this.light = this.context.get(PointLightPass).create([0.4,1,0.9])
        this.light.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,1,0], targetPosition, vec3()))

        this.fire = SharedSystem.particles.fire.add({
            uLifespan: vec4(0.4,0.8,-0.2,0),
            uOrigin: vec3.add([0,0.5,0], targetPosition, vec3()),
            uRotation: vec2.ZERO,
            uGravity: vec3.ZERO,
            uSize: vec2(1,3),
            uRadius: vec2(0.8,1.4)
        })

        this.wave = new Sprite()
        this.wave.billboard = BillboardType.Sphere
        this.wave.material = new SpriteMaterial()
        this.wave.material.blendMode = null
        this.wave.material.program = SharedSystem.materials.distortion
        this.wave.material.diffuse = SharedSystem.textures.bulge
        this.wave.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,0,0], targetPosition, vec3()), Sprite.FlatUp)
        this.context.get(PostEffectPass).add(this.wave)

        this.core = new BatchMesh(doubleSided(SharedSystem.geometry.lowpolySphere))
        this.core.material = SharedSystem.materials.energyPurpleMaterial
        this.core.transform = this.context.get(TransformSystem).create(targetPosition)
        this.context.get(ParticleEffectPass).add(this.core)

        this.circle = new Sprite()
        this.circle.billboard = BillboardType.None
        this.circle.material = new SpriteMaterial()
        this.circle.material.program = this.context.get(ParticleEffectPass).program
        this.circle.material.diffuse = SharedSystem.textures.raysInner
        this.circle.transform = this.context.get(TransformSystem)
        .create(vec3.add([0,0.5,0], targetPosition, vec3()), Sprite.FlatUp)
        this.context.get(ParticleEffectPass).add(this.circle)

        const animate = AnimationTimeline(this, {
            'mesh.armature.nodes.0.rotation': PropertyAnimation([
                { frame: 0, value: quat.copy(this.mesh.armature.nodes[0].rotation, quat()) },
                { frame: 0.5, value: quat.multiply(quat.axisAngle(vec3.AXIS_Y, -0.5* Math.PI,quat()), orientation, quat()), ease: ease.quadInOut }
            ], quat.slerp),
            'mesh.armature': modelAnimations[TarantulaVariant.model].activateVariant,

            'trail': FollowPath.Line(FollowPath.separate(
                PropertyAnimation([
                    { frame: 0.6, value: originPosition[0] },
                    { frame: 1.0, value: targetPosition[0], ease: ease.linear }
                ], lerp),
                PropertyAnimation([
                    { frame: 0.6, value: originPosition[1] },
                    { frame: 1.0, value: targetPosition[1], ease: ease.cubicIn }
                ], lerp),
                PropertyAnimation([
                    { frame: 0.6, value: originPosition[2] },
                    { frame: 1.0, value: targetPosition[2], ease: ease.linear }
                ], lerp)
            ), { length: 0.06 }),
            'light.radius': PropertyAnimation([
                { frame: 1.1, value: 0 },
                { frame: 1.7, value: 6, ease: ease.quadOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 1.1, value: 8 },
                { frame: 1.7, value: 0, ease: ease.sineIn }
            ], lerp),
            'fire': EventTrigger([
                { frame: 1.0, value: 48 }
            ], EventTrigger.emit),
            'wave.transform.scale': PropertyAnimation([
                { frame: 1.2, value: vec3.ZERO },
                { frame: 1.6, value: [8,8,8], ease: ease.cubicOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 1.2, value: vec4.ONE },
                { frame: 1.6, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'core.transform.scale': PropertyAnimation([
                { frame: 1.0, value: vec3.ZERO },
                { frame: 1.6, value: [3,3,3], ease: ease.cubicOut }
            ], vec3.lerp),
            'core.color': PropertyAnimation([
                { frame: 1.0, value: [0.2,1,0.6,1] },
                { frame: 1.6, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'circle.transform.scale': PropertyAnimation([
                { frame: 1.0, value: vec3.ZERO },
                { frame: 1.4, value: [6,6,6], ease: ease.quartOut }
            ], vec3.lerp),
            'circle.color': PropertyAnimation([
                { frame: 1.0, value: [0.6,1,1,0] },
                { frame: 1.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),


            'pillar.transform.scale': PropertyAnimation([
                { frame: 0, value: [2,0,2] },
                { frame: 0.5, value: [1,3,1], ease: ease.quadOut },
                { frame: 0.8, value: [0,4,0], ease: ease.quadIn }
            ], vec3.lerp),
            'pillar.color': PropertyAnimation([
                { frame: 0, value: vec4.ZERO },
                { frame: 0.5, value: [0.4,1,0.8,1], ease: ease.cubicOut }
            ], vec4.lerp),
            'muzzle.transform.scale': PropertyAnimation([
                { frame: 0.7, value: [0,-1,0] },
                { frame: 1.1, value: [0.6,-2.8,0.6], ease: ease.cubicOut }
            ], vec3.lerp),
            'muzzle.color': PropertyAnimation([
                { frame: 0.7, value: [0.4,1,0.8,0] },
                { frame: 1.1, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'flash.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.4, value: [3,3,3], ease: ease.cubicOut }
            ], vec3.lerp),
            'flash.color': PropertyAnimation([
                { frame: 0.8, value: [0.4,1,0.9,1] },
                { frame: 1.4, value: [0,1,0.5,0.2], ease: ease.quadIn }
            ], vec4.lerp),
            'ring.transform.scale': PropertyAnimation([
                { frame: 0.7, value: vec3.ZERO },
                { frame: 1.0, value: [4,4,4], ease: ease.quadOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.7, value: [0.6,1,1,0] },
                { frame: 1.0, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp)
        })

        for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)
        this.context.get(TransformSystem).delete(this.muzzle.transform)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(TransformSystem).delete(this.circle.transform)
        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)

        SharedSystem.particles.fire.remove(this.fire)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(PostEffectPass).remove(this.wave)

        this.context.get(ParticleEffectPass).remove(this.trail)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(ParticleEffectPass).remove(this.muzzle)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.circle)
        this.context.get(ParticleEffectPass).remove(this.core)
    }
}