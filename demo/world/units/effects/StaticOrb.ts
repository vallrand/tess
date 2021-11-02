import { Application } from '../../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat } from '../../../engine/math'
import { MeshSystem, Mesh, Sprite, BillboardType, BatchMesh } from '../../../engine/components'
import { TransformSystem, Transform } from '../../../engine/scene'
import { DecalPass, Decal, ParticleEffectPass, PointLightPass, PointLight, PostEffectPass } from '../../../engine/pipeline'
import { DecalMaterial, SpriteMaterial } from '../../../engine/materials'
import { ParticleEmitter } from '../../../engine/particles'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, ease } from '../../../engine/animation'

import { TerrainSystem } from '../../terrain'
import { SharedSystem } from '../../shared'

export class StaticOrb {
    readonly tile: vec2 = vec2()
    transform: Transform
    orb: Mesh
    decal: Decal
    bolts: ParticleEmitter
    constructor(private readonly context: Application){}
    public get enabled(): boolean { return !!this.orb }
    public place(column: number, row: number){
        vec2.set(column, row, this.tile)
        this.transform = this.context.get(TransformSystem).create()
        this.context.get(TerrainSystem).tilePosition(this.tile[0], this.tile[1], this.transform.position)

        this.orb = new Mesh()
        this.orb.buffer = SharedSystem.geometry.sphereMesh
        this.orb.order = 4
        this.orb.layer = 8
        this.context.get(MeshSystem).list.push(this.orb)
        this.orb.transform = this.context.get(TransformSystem).create()
        this.orb.transform.parent = this.transform

        this.orb.material = SharedSystem.materials.orbMaterial
        this.orb.color[0] = 0

        this.decal = this.context.get(DecalPass).create(8)
        this.decal.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ZERO, this.transform)
        this.decal.material = SharedSystem.materials.corrosionMaterial

        this.bolts = SharedSystem.particles.bolts.add({
            uOrigin: vec3.add([0,0.5,0], this.transform.position, vec3()),
            uRadius: [0.6,1.2],
            uLifespan: [0.2,0.4,0,0],
            uGravity: vec3.ZERO,
            uRotation: [0,2*Math.PI],
            uOrientation: quat.IDENTITY,
            uSize: [0.5,2],
            uFrame: [0,4]
        })
    }
    public kill(): void {
        this.context.get(TransformSystem).delete(this.transform)
        this.context.get(TransformSystem).delete(this.orb.transform)
        this.context.get(TransformSystem).delete(this.decal.transform)
        this.context.get(DecalPass).delete(this.decal)
        this.orb = null
        SharedSystem.particles.bolts.remove(this.bolts)
    }
    public *appear(origin: vec3): Generator<ActionSignal> {
        const animate = AnimationTimeline(this, {
            'transform.position': PropertyAnimation([
                { frame: 0, value: vec3(this.transform.position[0], origin[1] + 0.7, this.transform.position[2]) },
                { frame: 0.5, value: vec3.copy(this.transform.position, vec3()), ease: ease.quadIn }
            ], vec3.lerp),
            'decal.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 0.5, value: [8,8,8], ease: ease.cubicOut }
            ], vec3.lerp),
            'decal.color': PropertyAnimation([
                { frame: 0, value: [0,1,1,1] }
            ], vec4.lerp),
            'orb.transform.scale': PropertyAnimation([
                { frame: 0, value: vec3.ZERO },
                { frame: 0.5, value: vec3.ONE, ease: ease.elasticOut(1,0.8) }
            ], vec3.lerp)
        })
        this.bolts.rate = 0.02
        for(const duration = 0.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        // this.context.get(AnimationSystem).start(this.dissolve(), true)
    }
    public *dissolve(): Generator<ActionSignal> {
        this.bolts.rate = 0
        const animate = AnimationTimeline(this, {
            'orb.color': PropertyAnimation([
                { frame: 0, value: [0,1,1,1] },
                { frame: 1, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'decal.color': PropertyAnimation([
                { frame: 0, value: [0,1,1,1] },
                { frame: 1, value: [0,1,1,0], ease: ease.sineOut }
            ], vec4.lerp)
        })
        for(const duration = 1, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }
        this.kill()
        // const index = this.parent.list.indexOf(this)
        // this.parent.list.splice(index, 1)
        // this.parent.pool.push(this)
    }
}