import { Application } from '../../../engine/framework'
import { clamp, lerp, vec2, vec3, vec4, quat, mat4, quadraticBezier3D } from '../../../engine/math'
import { MeshSystem, Mesh, BatchMesh, Sprite, BillboardType, Line } from '../../../engine/components'
import { TransformSystem } from '../../../engine/scene'
import { AnimationSystem, ActionSignal, PropertyAnimation, AnimationTimeline, EventTrigger, FollowPath, ease } from '../../../engine/animation'
import { ParticleEmitter } from '../../../engine/particles'
import { SpriteMaterial, DecalMaterial } from '../../../engine/materials'
import { ParticleEffectPass, PostEffectPass, PointLightPass, PointLight, DecalPass, Decal } from '../../../engine/pipeline'

import { TerrainSystem } from '../../terrain'
import { modelAnimations } from '../../animations'
import { SharedSystem } from '../../shared'
import { AISystem, AIUnit } from '../../opponent'

export class EnergyLinkEffect {
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

    constructor(private readonly context: Application){}
    *activate(): Generator<ActionSignal> {
        this.shield = new Mesh()
        this.shield.buffer = SharedSystem.geometry.sphereMesh
        this.shield.material = SharedSystem.materials.shieldMaterial
        this.shield.transform = this.context.get(TransformSystem)
        .create(vec3.ZERO, quat.IDENTITY, vec3.ONE, this.target.mesh.transform)
        this.context.get(ParticleEffectPass).add(this.shield)
        
        this.glow = Sprite.create(BillboardType.Sphere)
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