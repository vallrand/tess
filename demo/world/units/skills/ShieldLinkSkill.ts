import { Application } from '../../../engine/framework'
import { lerp, vec2, vec3, vec4, quat, mat4, quadraticBezier3D } from '../../../engine/math'
import { Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, FollowPath, ease } from '../../../engine/animation'
import { ParticleEffectPass, PostEffectPass } from '../../../engine/pipeline'

import { TerrainSystem } from '../../terrain'
import { SharedSystem, ModelAnimation } from '../../shared'
import { AIUnit, AIUnitSkill } from '../../military'

class EnergyLink {
    static readonly pool: EnergyLink[] = []
    static fade: ease.IEase = x => 1 - ease.quadOut(Math.max(0, 1-2*x)) - ease.quadIn(Math.max(0, 4*(x-1)+1))
    parent: AIUnit
    target: AIUnit
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

    constructor(private readonly context: Application){
        this.line = Line.create(16, 0, 1, x => 0.2 + 0.8 * ease.sineIn(Math.max(0, 1-2*x)))
        this.line.addColorFade(EnergyLink.fade, [1,0.8,1])
        this.line.material = SharedSystem.materials.effect.trailEnergy
    }
    public *activate(delay: number): Generator<ActionSignal> {
        for(const endTime = this.context.currentTime + delay; this.context.currentTime < endTime;)
            yield ActionSignal.WaitNextFrame

        this.shield = Mesh.create(SharedSystem.geometry.sphereMesh)
        this.shield.buffer = SharedSystem.geometry.sphereMesh
        this.shield.material = SharedSystem.materials.shieldMaterial
        this.shield.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.target.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.shield)
        
        this.glow = Sprite.create(BillboardType.Sphere)
        this.glow.material = SharedSystem.materials.sprite.particle
        this.glow.transform = this.context.get(TransformSystem)
        .create([0,1.5,0], quat.IDENTITY, vec3.ONE, this.target.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.line.material = SharedSystem.materials.effect.trailEnergy
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
        const start = vec3(0,4.5,-1.3), end = vec3(0,2,0)
        this.target.shield++
        connect: for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime

            mat4.transform(start, this.parent.mesh.transform.matrix, this.start)
            mat4.transform(end, this.target.mesh.transform.matrix, this.end)
            vec3.set(this.end[0], this.start[1], this.end[2], this.middle)

            animate(Math.min(1, elapsedTime), this.context.deltaTime)

            for(let i = 0; i < this.line.path.length; i++)
                this.line.path[i][1] += 0.4 * Math.cos((this.context.currentTime + 0.08*i) * Math.PI * 2) * EnergyLink.fade(i / (this.line.path.length - 1))

            if(elapsedTime > duration && this.idleIndex == -1) break
            else yield ActionSignal.WaitNextFrame
        }
        this.target.shield--
        disconnect: for(const duration = 2, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime + 1

            mat4.transform(start, this.parent.mesh.transform.matrix, this.start)
            mat4.transform(end, this.target.mesh.transform.matrix, this.end)
            vec3.set(this.end[0], this.start[1], this.end[2], this.middle)

            animate(elapsedTime, this.context.deltaTime)

            for(let i = 0; i < this.line.path.length; i++)
                this.line.path[i][1] += 0.4 * Math.cos((this.context.currentTime + 0.08*i) * Math.PI * 2) * EnergyLink.fade(i / (this.line.path.length - 1))

            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(this.shield.transform)
        this.context.get(TransformSystem).delete(this.glow.transform)
        this.context.get(ParticleEffectPass).remove(this.shield)
        this.context.get(ParticleEffectPass).remove(this.glow)
        this.context.get(ParticleEffectPass).remove(this.line)
        Sprite.delete(this.glow)
        EnergyLink.pool.push(this)
    }
}

const activateTimeline = {
    'mesh.armature': ModelAnimation('activate'),
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
    ], vec4.lerp)
}

export class ShieldLinkSkill extends AIUnitSkill {
    readonly cost: number = 1
    readonly range: number = 4
    readonly cardinal: boolean = false
    readonly pierce: boolean = false

    private readonly links: EnergyLink[] = []
    private idleIndex: number = -1

    private cylinder: BatchMesh
    private wave: Sprite
    private core: BatchMesh
    private glow: Sprite
    private pillar: Sprite
    private circle: Sprite
    private bulge: Sprite
    private mesh: Mesh

    public query(source: AIUnit): AIUnit[] {
        const terrain = this.context.get(TerrainSystem)
        return AIUnitSkill.queryArea(this.context, source.tile, this.minRange, this.range, 2)
        .map(tile => terrain.getTile<AIUnit>(tile[0], tile[1]) as AIUnit)
        .filter(entity => entity && entity instanceof AIUnit && entity !== source && entity.size[0] == 1)
    }
    public *use(source: AIUnit, target: vec2): Generator<ActionSignal> {
        this.mesh = source.mesh
        this.cylinder = BatchMesh.create(SharedSystem.geometry.lowpolyCylinder)
        this.cylinder.material = SharedSystem.materials.sprite.spiral
        this.cylinder.transform = this.context.get(TransformSystem)
        .create([0,0.5,-1.3],quat.IDENTITY,vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.cylinder)
        
        this.wave = Sprite.create(BillboardType.None)
        this.wave.material = SharedSystem.materials.sprite.ring
        this.wave.transform = this.context.get(TransformSystem)
        .create([0,4,-1.3],quat.HALF_X,vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.wave)

        this.core = BatchMesh.create(SharedSystem.geometry.lowpoly.sphere)
        this.core.material = SharedSystem.materials.effect.energyPurple
        this.core.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.core)

        this.glow = Sprite.create(BillboardType.Sphere)
        this.glow.material = SharedSystem.materials.sprite.glow
        this.glow.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.IDENTITY,vec3.ONE, this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.glow)

        this.pillar = Sprite.create(BillboardType.Cylinder, 0, vec4.ONE, [0,0.5])
        this.pillar.material = SharedSystem.materials.sprite.beam
        this.pillar.transform = this.context.get(TransformSystem)
        .create([0,2,-1.3],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.pillar)

        this.circle = Sprite.create(BillboardType.None)
        this.circle.material = SharedSystem.materials.effect.flashYellow
        this.circle.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.HALF_X,vec3.ONE,this.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.circle)

        this.bulge = Sprite.create(BillboardType.Sphere)
        this.bulge.material = SharedSystem.materials.displacement.bulge
        this.bulge.transform = this.context.get(TransformSystem)
        .create([0,4.5,-1.3],quat.IDENTITY,vec3.ONE,this.mesh.transform)
        this.context.get(PostEffectPass).add(this.bulge)

        const affected = this.query(source)
        for(let i = 0; i < affected.length; i++){
            const link = EnergyLink.pool.pop() || new EnergyLink(this.context)
            link.parent = source
            link.target = affected[i]
            this.links.push(link)
            link.idleIndex = this.context.get(AnimationSystem).start(link.activate(0.5), true)
        }
        const animate = AnimationTimeline(this, activateTimeline)

        for(const duration = 1.8, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
        this.idleIndex = this.context.get(AnimationSystem).start(this.idle(), true)
        this.active = true

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
        Sprite.delete(this.bulge)
        Sprite.delete(this.wave)
        Sprite.delete(this.pillar)
        Sprite.delete(this.circle)
        BatchMesh.delete(this.cylinder)
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
        this.active = false

        const animate = AnimationTimeline(this, {
            'mesh.armature.nodes.2.rotation': PropertyAnimation([
                { frame: 0, value: quat.axisAngle(vec3.AXIS_Y, angle, quat()) },
                { frame: 0.5, value: quat.IDENTITY, ease: ease.quadOut }
            ], quat.slerp),
            'mesh.armature': ModelAnimation('deactivate'),
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
        this.links.length = 0

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
        Sprite.delete(this.glow)
        BatchMesh.delete(this.core)
    }
    public *deactivate(immediate?: boolean): Generator<ActionSignal> {
        if(this.idleIndex == -1) return
        if(immediate){
            while(this.links.length) this.links.pop().idleIndex = -1
            this.context.get(AnimationSystem).stop(this.idleIndex)
            this.active = false
        }else{
            const waiter = this.context.get(AnimationSystem).await(this.idleIndex)
            this.idleIndex = -1
            yield waiter
        }
    }
}