import { Application } from '../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4, ease } from '../../engine/math'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../engine/components'
import { TransformSystem, AnimationSystem, ActionSignal } from '../../engine/scene'
import { PropertyAnimation, AnimationTimeline, BlendTween, EventTrigger, FollowPath, quadraticBezier3D } from '../../engine/scene'
import { ParticleEmitter } from '../../engine/particles'
import { SpriteMaterial, DecalMaterial } from '../../engine/materials'
import { ParticleEffectPass, PostEffectPass, PointLightPass, PointLight, DecalPass, Decal } from '../../engine/pipeline'

import { TerrainSystem } from '../terrain'
import { modelAnimations } from '../animations'
import { SharedSystem } from '../shared'
import { ControlUnit } from './Unit'
import { AISystem } from '../mechanics'

class EnergyLinkEffect {
    parent: Locust
    target: ControlUnit
    idleIndex: number = -1

    private line: Line
    private shield: Mesh
    private glow: Sprite

    private readonly start: vec3 = vec3()
    private readonly middle: vec3 = vec3()
    private readonly end: vec3 = vec3()
    private readonly curve = FollowPath.curve(
        quadraticBezier3D.bind(null, this.start, this.middle, this.end),
        { frame: 0, duration: 1.0, ease: ease.sineOut }
    )

    constructor(private readonly context: Application){}
    *activate(): Generator<ActionSignal> {
        this.shield = new Mesh()
        this.shield.buffer = SharedSystem.geometry.sphereMesh
        this.shield.material = SharedSystem.materials.shieldMaterial
        this.shield.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.target.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.shield)
        
        this.glow = new Sprite()
        this.glow.billboard = BillboardType.Sphere
        this.glow.material = new SpriteMaterial()
        this.glow.material.program = this.context.get(ParticleEffectPass).program
        this.glow.material.diffuse = SharedSystem.textures.particle
        this.glow.transform = this.context.get(TransformSystem)
        .create([0,1.5,0], quat.IDENTITY, vec3.ONE, this.target.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.line = new Line(16)
        const fadeEase: ease.IEase = x => 1 - ease.quadOut(Math.max(0, 1-2*x)) - ease.quadIn(Math.max(0, 4*(x-1)+1))
        this.line.ease = x => 0.2 + 0.8 * ease.sineIn(Math.max(0, 1-2*x))
        this.line.addColorFade(fadeEase, [1,0.8,1])
        this.line.material = SharedSystem.materials.trailEnergyMaterial
        this.context.get(ParticleEffectPass).add(this.line)

        const animate = AnimationTimeline(this, {
            'shield.color': PropertyAnimation([
                { frame: 1.0, value: [0.6,0.2,1,1] },
                { frame: 2.0, value: vec4.ZERO, ease: ease.sineIn }
            ], vec3.lerp),
            'shield.transform.scale': PropertyAnimation([
                { frame: 0.2, value: vec3.ZERO },
                { frame: 1.0, value: [1,2,1], ease: ease.elasticOut(1,0.75) }
            ], vec3.lerp),
            'line': FollowPath.Line(this.curve, { length: 1.0 / (this.line.path.length-1) }),
            'line.width': PropertyAnimation([
                { frame: 0, value: 0 },
                { frame: 1.0, value: 3, ease: ease.quartOut },
                { frame: 2.0, value: 0, ease: ease.quadIn }
            ], lerp),
            'glow.transform.scale': PropertyAnimation([
                { frame: 0.2, value: vec3.ZERO },
                { frame: 1.0, value: [4,4,4], ease: ease.quadOut }
            ], vec3.lerp),
            'glow.color': PropertyAnimation([
                { frame: 1.0, value: [0.6,0.4,1,0.2] },
                { frame: 2.0, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp)
        })

        connect: for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime

            mat4.transform([0,4.5,-1.3], this.parent.mesh.transform.matrix, this.start)
            mat4.transform([0,2,0], this.target.mesh.transform.matrix, this.end)
            vec3.set(this.end[0], this.start[1], this.end[2], this.middle)

            animate(Math.min(1, elapsedTime), this.context.deltaTime)

            for(let i = 0; i < this.line.path.length; i++)
                this.line.path[i][1] += 0.4 * Math.cos((this.context.currentTime + 0.08*i) * Math.PI * 2) * fadeEase(i / (this.line.path.length - 1))

            if(elapsedTime > duration && this.idleIndex == -1) break
            else yield ActionSignal.WaitNextFrame
        }

        disconnect: for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime + 1

            mat4.transform([0,4.5,-1.3], this.parent.mesh.transform.matrix, this.start)
            mat4.transform([0,2,0], this.target.mesh.transform.matrix, this.end)
            vec3.set(this.end[0], this.start[1], this.end[2], this.middle)

            animate(elapsedTime, this.context.deltaTime)

            for(let i = 0; i < this.line.path.length; i++)
                this.line.path[i][1] += 0.4 * Math.cos((this.context.currentTime + 0.08*i) * Math.PI * 2) * fadeEase(i / (this.line.path.length - 1))

            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.shield.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.context.get(ParticleEffectPass).remove(this.shield)
        this.context.get(ParticleEffectPass).remove(this.glow)
        this.context.get(ParticleEffectPass).remove(this.line)
    }
}

export class Locust extends ControlUnit {
    private static readonly model: string = 'locust'
    public readonly size: vec2 = vec2(2,2)

    private readonly links: EnergyLinkEffect[] = []
    private idleIndex: number = -1

    private motorLeft: BatchMesh
    private motorRight: BatchMesh

    private cylinder: BatchMesh
    private wave: Sprite
    private core: BatchMesh
    private glow: Sprite
    private pillar: Sprite
    private circle: Sprite
    private bulge: Sprite

    private corridor: BatchMesh
    private fire: ParticleEmitter
    private lineA: Line
    private lineB: Line
    private burn: Decal
    private light: PointLight
    private heat: BatchMesh
    private ring: Sprite

    constructor(context: Application){super(context)}
    public place(column: number, row: number): void {
        this.mesh = this.context.get(MeshSystem).loadModel(Locust.model)
        this.mesh.transform = this.context.get(TransformSystem).create()
        this.snapPosition(vec2.set(column, row, this.tile), this.mesh.transform.position)
        modelAnimations[Locust.model].activate(0, this.mesh.armature)


    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
    }
    public disappear(): Generator<ActionSignal> {
        return this.dissolveRigidMesh(this.mesh)
    }
    public *move(path: vec2[]): Generator<ActionSignal> {
        this.motorLeft = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.motorLeft.material = SharedSystem.materials.stripesMaterial
        this.motorLeft.transform = this.context.get(TransformSystem)
        .create([1.3,0.7,1.2], Sprite.FlatUp, [1,-1.6,1], this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.motorLeft)
        
        this.motorRight = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.motorRight.material = SharedSystem.materials.stripesMaterial
        this.motorRight.transform = this.context.get(TransformSystem)
        .create([-1.3,0.7,1.2], Sprite.FlatUp, [1,-1.6,1], this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.motorRight)

        const animate = AnimationTimeline(this, {
            'motorLeft.color': PropertyAnimation([
                { frame: 0, value: vec4.ZERO },
                { frame: 1, value: [0.5,0.3,0.8,1], ease: ease.cubicOut }
            ], vec4.lerp),
            'motorRight.color': PropertyAnimation([
                { frame: 0, value: vec4.ZERO },
                { frame: 1, value: [0.5,0.3,0.8,1], ease: ease.cubicOut }
            ], vec4.lerp)
        })

        const floatDuration = 0.8
        const duration = path.length * floatDuration + 2 * floatDuration

        for(const generator = this.moveAlongPath(path, this.mesh.transform, floatDuration, true), startTime = this.context.currentTime; true;){
            const iterator = generator.next()
            const elapsedTime = this.context.currentTime - startTime

            const floatTime = clamp(Math.min(duration-elapsedTime,elapsedTime)/floatDuration,0,1)
            animate(floatTime, this.context.deltaTime)

            if(iterator.done) break
            else yield iterator.value
        }

        this.context.get(TransformSystem).delete(this.motorLeft.transform)
        this.context.get(TransformSystem).delete(this.motorRight.transform)
        this.context.get(ParticleEffectPass).remove(this.motorLeft)
        this.context.get(ParticleEffectPass).remove(this.motorRight)
    }
    public strike(target: vec2): Generator<ActionSignal> {
        return this.activate()
    }
    private *activate(): Generator<ActionSignal> {
        this.cylinder = new BatchMesh(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = new SpriteMaterial()
        this.cylinder.material.program = this.context.get(ParticleEffectPass).program
        this.cylinder.material.diffuse = SharedSystem.textures.wind
        this.cylinder.transform = this.context.get(TransformSystem)
        .create([0,0.5,-1.3],quat.IDENTITY,vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)
        
        this.wave = new Sprite()
        this.wave.billboard = BillboardType.None
        this.wave.material = new SpriteMaterial()
        this.wave.material.program = this.context.get(ParticleEffectPass).program
        this.wave.material.diffuse = SharedSystem.textures.ring
        this.wave.transform = this.context.get(TransformSystem)
        .create([0,4,-1.3],Sprite.FlatUp,vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.wave)

        this.core = new BatchMesh(SharedSystem.geometry.lowpolySphere)
        this.core.material = SharedSystem.materials.energyPurpleMaterial
        this.core.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.core)

        this.glow = new Sprite()
        this.glow.billboard = BillboardType.Sphere
        this.glow.material = new SpriteMaterial()
        this.glow.material.program = this.context.get(ParticleEffectPass).program
        this.glow.material.diffuse = SharedSystem.textures.glow
        this.glow.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.IDENTITY,vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.pillar = new Sprite()
        this.pillar.billboard = BillboardType.Cylinder
        vec2.set(0,0.5,this.pillar.origin)
        this.pillar.material = new SpriteMaterial()
        this.pillar.material.program = this.context.get(ParticleEffectPass).program
        this.pillar.material.diffuse = SharedSystem.textures.raysBeam
        this.pillar.transform = this.context.get(TransformSystem)
        .create([0,2,-1.3],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.circle = new Sprite()
        this.circle.billboard = BillboardType.None
        this.circle.material = SharedSystem.materials.flashYellowMaterial
        this.circle.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],Sprite.FlatUp,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.circle)

        this.bulge = new Sprite()
        this.bulge.billboard = BillboardType.Sphere
        this.bulge.material = new SpriteMaterial()
        this.bulge.material.blendMode = null
        this.bulge.material.program = SharedSystem.materials.distortion
        this.bulge.material.diffuse = SharedSystem.textures.bulge
        this.bulge.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(PostEffectPass).add(this.bulge)

        const affected = this.context.get(AISystem).query(this.tile, 0)
        for(let i = 0; i < affected.length; i++){
            const link = new EnergyLinkEffect(this.context)
            link.parent = this
            link.target = affected[i]
            this.links.push(link)
        }

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[Locust.model].activate,

            'cylinder.transform.scale': PropertyAnimation([
                { frame: 0.0, value: [3,1,3] },
                { frame: 0.8, value: [1,5,1], ease: ease.quadOut }
            ], vec3.lerp),
            'cylinder.transform.rotation': PropertyAnimation([
                { frame: 0.0, value: quat.IDENTITY },
                { frame: 0.8, value: [0,-1,0,0], ease: ease.sineOut }
            ], quat.slerp),
            'cylinder.color': PropertyAnimation([
                { frame: 0.0, value: vec4.ZERO },
                { frame: 0.3, value: [0.4,0.6,1,0.6], ease: ease.quadOut },
                { frame: 0.8, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'wave.transform.scale': PropertyAnimation([
                { frame: 0.6, value: vec3.ZERO },
                { frame: 1.2, value: [4,4,4], ease: ease.cubicOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: 0.6, value: [0.8,0.4,1,0.4] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'core.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.8, value: [1.4,1.4,1.4], ease: ease.elasticOut(1,0.6) }
            ], vec3.lerp),
            'core.color': PropertyAnimation([
                { frame: 0, value: [0.4,0.4,1,0.8] }
            ], vec4.lerp),
            'core.transform.position': PropertyAnimation([
                { frame: 0.6, value: [0,5.5,-1.3] },
                { frame: 1.0, value: [0,4.5,-1.3], ease: ease.sineInOut }
            ], vec3.lerp),
            'glow.transform.scale': PropertyAnimation([
                { frame: 0.6, value: vec3.ZERO },
                { frame: 1.2, value: [4,4,4], ease: ease.quadOut }
            ], vec3.lerp),
            'glow.color': PropertyAnimation([
                { frame: 0.6, value: vec4.ONE },
                { frame: 1.2, value: [0.6,0.4,1,0], ease: ease.sineIn }
            ], vec4.lerp),
            'glow.transform.position': PropertyAnimation([
                { frame: 0.6, value: [0,5.5,-1.3] },
                { frame: 1.0, value: [0,4.5,-1.3], ease: ease.sineInOut }
            ], vec3.lerp),
            'pillar.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 0.6, value: [4,6,4], ease: ease.quartOut }
            ], vec3.lerp),
            'pillar.color': PropertyAnimation([
                { frame: 0, value: [1,0.5,1,0] },
                { frame: 0.6, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'circle.transform.scale': PropertyAnimation([
                { frame: 0.7, value: vec3.ZERO },
                { frame: 1.8, value: [5,5,5], ease: ease.cubicOut }
            ], vec3.lerp),
            'circle.color': PropertyAnimation([
                { frame: 0.7, value: [0.4,0.2,1,1] },
                { frame: 1.8, value: [0,0,1,0], ease: ease.quadIn }
            ], vec4.lerp),
            'bulge.transform.scale': PropertyAnimation([
                { frame: 0.8, value: vec3.ZERO },
                { frame: 1.4, value: [6,6,6], ease: ease.quadOut }
            ], vec3.lerp),
            'bulge.color': PropertyAnimation([
                { frame: 0.8, value: vec4.ONE },
                { frame: 1.4, value: vec4.ZERO, ease: ease.cubicIn }
            ], vec4.lerp),
            'links': EventTrigger(this.links.map((link, index) => ({
                frame: 0.5, value: index
            })), (links: EnergyLinkEffect[], index: number) => {
                if(links[index].idleIndex == -1)
                    links[index].idleIndex = this.context.get(AnimationSystem).start(links[index].activate(), true)
            })
        })

        for(const duration = 1.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.cylinder.transform)
        this.context.get(TransformSystem).delete(this.wave.transform)
        this.context.get(TransformSystem).delete(this.pillar.transform)
        this.context.get(TransformSystem).delete(this.circle.transform)
        this.context.get(TransformSystem).delete(this.bulge.transform)

        this.context.get(PostEffectPass).remove(this.bulge)
        this.context.get(ParticleEffectPass).remove(this.cylinder)
        this.context.get(ParticleEffectPass).remove(this.wave)
        this.context.get(ParticleEffectPass).remove(this.pillar)
        this.context.get(ParticleEffectPass).remove(this.circle)

        this.idleIndex = this.context.get(AnimationSystem).start(this.idle(), true)
        this.idleIndex = -1
    }
    private *idle(): Generator<ActionSignal> {
        let angle: number, angularVelocity = -0.5*Math.PI / 0.6
        for(const startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            angle = (elapsedTime * angularVelocity - 0.5 * Math.PI) % (2 * Math.PI)
            quat.axisAngle(vec3.AXIS_Y, angle, this.mesh.armature.nodes[2].rotation)
            this.mesh.armature.frame = 0
            if(this.idleIndex == -1) break
            else yield ActionSignal.WaitNextFrame
        }

        const animate = AnimationTimeline(this, {
            'mesh.armature.nodes.2.rotation': PropertyAnimation([
                { frame: 0, value: quat.axisAngle(vec3.AXIS_Y, angle, quat()) },
                { frame: 0.5, value: quat.IDENTITY, ease: ease.quadOut }
            ], quat.slerp),
            'mesh.armature': modelAnimations[Locust.model].deactivate,
            'core.color': PropertyAnimation([
                { frame: 0, value: [0.4,0.4,1,0.8] },
                { frame: 0.6, value: vec4.ZERO, ease: ease.quadOut }
            ], vec4.lerp),
            'glow.color': PropertyAnimation([
                { frame: 0, value: [0.6,0.4,1,0] },
                { frame: 0.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp)
        })

        for(let i = 0; i < this.links.length; i++) this.links[i].idleIndex = -1

        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.context.get(ParticleEffectPass).remove(this.core)
        this.context.get(ParticleEffectPass).remove(this.glow)
    }
    private *launch(): Generator<ActionSignal> {
        this.corridor = new BatchMesh(SharedSystem.geometry.openBox)
        this.corridor.material = SharedSystem.materials.coreYellowMaterial
        this.corridor.transform = this.context.get(TransformSystem)
        .create([0,1.2,0], Sprite.FlatUp, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.corridor)

        this.fire = SharedSystem.particles.fire.add({
            uLifespan: vec4(0.4,0.8,-0.3,0),
            uOrigin: mat4.transform([0,1,1], this.mesh.transform.matrix, vec3()),
            uRotation: vec2.ZERO, uGravity: mat4.transformNormal([0,0,12], this.mesh.transform.matrix, vec3()),
            uSize: vec2(0.5,1.5), uRadius: vec2(0,1.5)
        })

        this.lineA = new Line(2)
        this.lineB = new Line(2)
        this.lineA.width = 1.6
        this.lineB.width = 1.6

        mat4.transform([0,1.3,0], this.mesh.transform.matrix, this.lineA.path[0])
        mat4.transform([0,1.7,0], this.mesh.transform.matrix, this.lineB.path[0])
        mat4.transform([0,1.3,10], this.mesh.transform.matrix, this.lineA.path[1])
        mat4.transform([0,1.7,10], this.mesh.transform.matrix, this.lineB.path[1])

        this.lineA.material = SharedSystem.materials.exhaustMaterial
        this.lineB.material = SharedSystem.materials.exhaustMaterial
        this.context.get(ParticleEffectPass).add(this.lineA)
        this.context.get(ParticleEffectPass).add(this.lineB)

        this.burn = this.context.get(DecalPass).create(4)
        this.burn.material = new DecalMaterial()
        this.burn.material.program = this.context.get(DecalPass).program
        this.burn.material.diffuse = SharedSystem.textures.groundDust
        this.burn.transform = this.context.get(TransformSystem)
        .create([0,0,6],quat.axisAngle(vec3.AXIS_Y,-0.5*Math.PI,quat()),vec3.ONE,this.mesh.transform)

        this.light = this.context.get(PointLightPass).create([0.2,1,0.6])
        this.light.transform = this.context.get(TransformSystem)
        .create([0,2,2], quat.IDENTITY, vec3.ONE, this.mesh.transform)

        this.heat = new BatchMesh(SharedSystem.geometry.openBox)
        this.heat.material = new SpriteMaterial()
        this.heat.material.blendMode = null
        this.heat.material.diffuse = SharedSystem.textures.perlinNoise
        this.heat.material.program = SharedSystem.materials.heatDistortion
        this.heat.transform = this.context.get(TransformSystem)
        .create([0,1,0], Sprite.FlatUp, vec3.ONE, this.mesh.transform)
        this.context.get(PostEffectPass).add(this.heat)

        this.ring = new Sprite()
        this.ring.billboard = BillboardType.None
        this.ring.material = SharedSystem.materials.auraTealMaterial
        this.ring.transform = this.context.get(TransformSystem)
        .create([0,1,1.5], quat.IDENTITY, vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.ring)

        const animate = AnimationTimeline(this, {
            'mesh.armature': modelAnimations[Locust.model].activateVariant,

            'ring.transform.scale': PropertyAnimation([
                { frame: 0.2, value: vec3.ZERO },
                { frame: 1.2, value: [6,6,6], ease: ease.cubicOut }
            ], vec3.lerp),
            'ring.color': PropertyAnimation([
                { frame: 0.2, value: [0.5,1,0.8,1] },
                { frame: 1.2, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),

            'heat.transform.scale': PropertyAnimation([
                { frame: 0.2, value: [2,0,2] },
                { frame: 1.6, value: [3,8,3], ease: ease.cubicOut }
            ], vec3.lerp),
            'heat.color': PropertyAnimation([
                { frame: 0.2, value: [0.2,1,1,1] },
                { frame: 1.6, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),

            'light.radius': PropertyAnimation([
                { frame: 0.3, value: 0 },
                { frame: 1.4, value: 5, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: 0.3, value: 10 },
                { frame: 1.4, value: 0, ease: ease.quadIn }
            ], lerp),
            'corridor.transform.scale': PropertyAnimation([
                { frame: 0.2, value: [1.5,0,2] },
                { frame: 1.0, value: [1.5,6,2], ease: ease.sineOut }
            ], vec3.lerp),
            'corridor.color': PropertyAnimation([
                { frame: 0.2, value: [0.2,1,1,1] },
                { frame: 1.0, value: [0,1,1,0], ease: ease.quadIn }
            ], vec4.lerp),
            'fire': EventTrigger([
                { frame: 0.2, value: 48 }
            ], EventTrigger.emit),
            'lineA.path.1': PropertyAnimation([
                { frame: 0.4, value: this.lineA.path[0] },
                { frame: 1.4, value: vec3.copy(this.lineA.path[1], vec3()), ease: ease.quartOut }
            ], vec3.lerp),
            'lineB.path.1': PropertyAnimation([
                { frame: 0.4, value: this.lineB.path[0] },
                { frame: 1.4, value: vec3.copy(this.lineB.path[1], vec3()), ease: ease.quartOut }
            ], vec3.lerp),
            'lineA.color': PropertyAnimation([
                { frame: 0.4, value: [0.2,1,0.8,1] },
                { frame: 1.4, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'lineB.color': PropertyAnimation([
                { frame: 0.4, value: [0.2,1,0.8,1] },
                { frame: 1.4, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'burn.transform.scale': PropertyAnimation([
                { frame: 0, value: [10,4,5] }
            ], vec3.lerp),
            'burn.color': PropertyAnimation([
                { frame: 0.4, value: vec4.ZERO },
                { frame: 1.0, value: [0,0,0,1], ease: ease.sineOut },
                { frame: 1.8, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp)
        })

        for(const duration = 1.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.corridor.transform)
        this.context.get(TransformSystem).delete(this.burn.transform)
        this.context.get(TransformSystem).delete(this.light.transform)
        this.context.get(TransformSystem).delete(this.heat.transform)
        this.context.get(TransformSystem).delete(this.ring.transform)
        SharedSystem.particles.fire.remove(this.fire)
        this.context.get(PostEffectPass).remove(this.heat)
        this.context.get(PointLightPass).delete(this.light)
        this.context.get(DecalPass).delete(this.burn)
        this.context.get(ParticleEffectPass).remove(this.corridor)
        this.context.get(ParticleEffectPass).remove(this.ring)
        this.context.get(ParticleEffectPass).remove(this.lineA)
        this.context.get(ParticleEffectPass).remove(this.lineB)
    }
}