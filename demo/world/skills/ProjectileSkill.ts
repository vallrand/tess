import { Application } from '../../engine/framework'
import { ease, lerp, mat4, mod, quat, range, vec2, vec3, vec4 } from '../../engine/math'
import { uintNorm4x8 } from '../../engine/pipeline/batch'
import { BatchMesh, BillboardType, Line, Mesh, Sprite, FollowTrail } from '../../engine/components'
import { DecalMaterial, EffectMaterial, SpriteMaterial } from '../../engine/materials'
import { GL, ShaderProgram } from '../../engine/webgl'
import { GradientRamp, ParticleEmitter } from '../../engine/particles'
import { shaders } from '../../engine/shaders'
import { Decal, DecalPass, ParticleEffectPass, PointLight, PointLightPass, PostEffectPass } from '../../engine/pipeline'
import { AnimationTimeline, PropertyAnimation, EmitterTrigger, TransformSystem, ActionSignal, AnimationSystem, Transform } from '../../engine/scene'
import { CubeModuleModel, modelAnimations } from '../animations'
import { Cube, Direction, DirectionAngle } from '../player'
import { CubeSkill } from './CubeSkill'
import { SharedSystem } from '../shared'
import { TerrainSystem } from '../terrain'

const actionTimeline = {
    'bulge.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.5, value: [3,3,3], ease: ease.quartOut }
    ], vec3.lerp),
    'bulge.color': PropertyAnimation([
        { frame: 0, value: vec4.ONE },
        { frame: 0.5, value: vec4.ZERO, ease: ease.quadIn }
    ], vec4.lerp),
    'flash.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.5, value: [4,4,4], ease: ease.cubicOut }
    ], vec3.lerp),
    'flash.color': PropertyAnimation([
        { frame: 0.2, value: vec4.ONE },
        { frame: 0.5, value: [1,1,1,0.2], ease: ease.sineIn }
    ], vec4.lerp),
    'core.transform.scale': PropertyAnimation([
        { frame: 0, value: vec3.ZERO },
        { frame: 0.1, value: [4,4,4], ease: ease.cubicIn },
        { frame: 0.3, value: vec3.ZERO, ease: ease.quadOut }
    ], vec3.lerp),
    'core.color': PropertyAnimation([
        { frame: 0, value: [1,1,0.8,0] },
        { frame: 0.3, value: [0.6,0.6,0,0], ease: ease.quadIn }
    ], vec4.lerp),
    'light.radius': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.5, value: 5, ease: ease.quartOut }
    ], lerp),
    'light.intensity': PropertyAnimation([
        { frame: 0, value: 0 },
        { frame: 0.1, value: 4, ease: ease.quadIn },
        { frame: 0.5, value: 0, ease: ease.cubicOut }
    ], lerp)
}

interface ProjectileEffect {
    readonly origin: vec3
    transform: Transform
    sphere: BatchMesh
    particles: ParticleEmitter
    trail: Line
    glow: Sprite
    light: PointLight
    burn: Decal
    wave: Sprite
}

export class ProjectileSkill extends CubeSkill {
    private readonly pool: ProjectileEffect[] = []
    private mesh: Mesh
    private readonly pivot: vec3 = vec3(0,1.8,0)

    private bulge: Sprite
    private flash: Sprite
    private core: Sprite
    private light: PointLight
    private particles: ParticleEmitter
    private trailMaterial: SpriteMaterial
    private glowMaterial: SpriteMaterial
    private burnMaterial: DecalMaterial
    private waveMaterial: SpriteMaterial
    constructor(context: Application, cube: Cube){
        super(context, cube)

        this.trailMaterial = new SpriteMaterial()
        this.trailMaterial.program = this.context.get(ParticleEffectPass).program
        this.trailMaterial.diffuse = SharedSystem.gradients.yellowLine

        this.glowMaterial = new SpriteMaterial()
        this.glowMaterial.diffuse = SharedSystem.textures.raysRing
        this.glowMaterial.program = this.context.get(ParticleEffectPass).program

        this.burnMaterial = new DecalMaterial()
        this.burnMaterial.program = this.context.get(DecalPass).program
        this.burnMaterial.diffuse = SharedSystem.textures.particle

        this.waveMaterial = new SpriteMaterial()
        this.waveMaterial.blendMode = null
        this.waveMaterial.program = SharedSystem.materials.distortion
        this.waveMaterial.diffuse = SharedSystem.textures.wave


        this.bulge = new Sprite()
        this.bulge.billboard = BillboardType.Sphere
        this.bulge.material = new SpriteMaterial()
        this.bulge.material.blendMode = null
        this.bulge.material.program = SharedSystem.materials.chromaticAberration
        this.bulge.material.diffuse = SharedSystem.textures.particle

        this.core = new Sprite()
        this.core.billboard = BillboardType.Sphere
        this.core.material = new SpriteMaterial()
        this.core.material.program = this.context.get(ParticleEffectPass).program
        this.core.material.diffuse = SharedSystem.textures.rays

        this.flash = new Sprite()
        this.flash.billboard = BillboardType.None
        this.flash.material = SharedSystem.materials.flashYellowMaterial
    }
    public *activate(transform: mat4, orientation: quat, direction: Direction): Generator<ActionSignal> {
        const mesh = this.mesh = this.cube.meshes[this.cube.state.side]
        const armatureAnimation = modelAnimations[CubeModuleModel[this.cube.state.sides[this.cube.state.side].type]]
        const rotationalIndex = mod(direction - this.cube.state.direction - this.cube.state.sides[this.cube.state.side].direction, 4)

        const worldTransform = mat4.fromRotationTranslationScale(DirectionAngle[(direction + 3) % 4], this.pivot, vec3.ONE, mat4())
        mat4.multiply(this.cube.transform.matrix, worldTransform, worldTransform)

        const origin = vec3(0,0,1.2)
        mat4.transform(origin, worldTransform, origin)

        rotate: {
            const prevRotation = quat.copy(mesh.armature.nodes[1].rotation, quat())
            const nextRotation = DirectionAngle[(rotationalIndex + 1) % 4]
            if(quat.angle(prevRotation, nextRotation) < 1e-3) break rotate

            const rotate = PropertyAnimation([
                { frame: 0, value: prevRotation },
                { frame: 0.2, value: nextRotation, ease: ease.quadInOut }
            ], quat.slerp)
    
            for(const duration = 0.2, startTime = this.context.currentTime; true;){
                const elapsedTime = this.context.currentTime - startTime
                rotate(elapsedTime, mesh.armature.nodes[1].rotation)
                mesh.armature.frame = 0
                if(elapsedTime > duration) break
                yield ActionSignal.WaitNextFrame
            }
        }


        const parentTransform = this.context.get(TransformSystem).create()
        quat.copy(DirectionAngle[(direction + 3) % 4], parentTransform.rotation)
        vec3.copy(origin, parentTransform.position)

        this.bulge.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.bulge.transform.position)
        this.context.get(PostEffectPass).add(this.bulge)

        this.core.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, this.core.transform.position)
        this.context.get(ParticleEffectPass).add(this.core)

        this.flash.transform = this.context.get(TransformSystem).create()
        this.flash.transform.parent = parentTransform
        this.context.get(ParticleEffectPass).add(this.flash)

        this.light = this.context.get(PointLightPass).create()
        this.light.transform = parentTransform
        vec3.set(1, 0.9, 0.5, this.light.color)

        this.particles = SharedSystem.particles.embers.add({
            uLifespan: [0.1,0.4,-0.1,0],
            uOrigin: mat4.transform([0,0,2.0], worldTransform, vec3()),
            uRotation: vec2.ZERO, uGravity: vec3.ZERO,
            uSize: [0.1,0.6],
            uRadius: [0,0.4],
            uOrientation: quat.axisAngle(quat.transform(vec3.AXIS_Z, DirectionAngle[direction], vec3()), 0.5 * Math.PI, quat()),
            uForce: [2+6,10+6],
            uTarget: mat4.transform(vec3.ZERO, worldTransform, vec3()),
        })

        const animate = AnimationTimeline(this, {
            ...actionTimeline,
            'particles': EmitterTrigger({ frame: 0, value: 36 })
        })

        this.context.get(AnimationSystem).start(this.animateProjectile(worldTransform, this.findTarget(direction)), true)

        for(const duration = 0.5, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            armatureAnimation.activate(elapsedTime, mesh.armature)
            armatureAnimation[`activate${rotationalIndex}`](elapsedTime, mesh.armature)

            if(elapsedTime > duration) break
            yield ActionSignal.WaitNextFrame
        }

        SharedSystem.particles.embers.remove(this.particles)

        this.context.get(TransformSystem).delete(parentTransform)
        this.context.get(TransformSystem).delete(this.bulge.transform)
        this.context.get(TransformSystem).delete(this.core.transform)
        this.context.get(TransformSystem).delete(this.flash.transform)

        this.context.get(PointLightPass).delete(this.light)
        this.context.get(ParticleEffectPass).remove(this.core)
        this.context.get(ParticleEffectPass).remove(this.flash)
        this.context.get(PostEffectPass).remove(this.bulge)
    }
    private createProjectile(): ProjectileEffect {
        if(this.pool.length) return this.pool.pop()

        const trail = new Line()
        trail.order = -2
        trail.width = 0.4
        trail.ease = x => 1-x*x
        trail.path = range(8).map(i => vec3())
        trail.addColorFade(trail.ease)
        trail.material = this.trailMaterial

        const sphere = new BatchMesh(SharedSystem.geometry.lowpolySphere)
        sphere.order = 8
        sphere.material = SharedSystem.materials.coreYellowMaterial

        const glow = new Sprite()
        glow.billboard = BillboardType.None
        glow.material = this.glowMaterial

        const wave = new Sprite()
        wave.billboard = BillboardType.None
        wave.material = this.waveMaterial

        return {
            trail, sphere, wave, glow, origin: vec3(),
            transform: null, particles: null, light: null, burn: null
        }
    }
    private *animateProjectile(transform: mat4, target: vec3): Generator<ActionSignal> {
        const fade: ease.IEase = x => 1 - Math.pow(1 - x * (1-x) * 4, 2)
        const effect = this.createProjectile()
        const origin = mat4.transform(vec3.ZERO, transform, effect.origin)

        effect.transform = this.context.get(TransformSystem).create()
        vec3.copy(origin, effect.transform.position)
        
        for(let i = effect.trail.path.length - 1; i >= 0; i--) vec3.copy(origin, effect.trail.path[i])
        this.context.get(ParticleEffectPass).add(effect.trail)

        effect.sphere.transform = this.context.get(TransformSystem).create()
        vec3.copy(target, effect.sphere.transform.position)
        this.context.get(ParticleEffectPass).add(effect.sphere)

        effect.glow.transform = this.context.get(TransformSystem).create()
        vec3.copy(target, effect.glow.transform.position)
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, effect.glow.transform.rotation)
        this.context.get(ParticleEffectPass).add(effect.glow)

        effect.burn = this.context.get(DecalPass).create(0)
        effect.burn.material = this.burnMaterial
        effect.burn.transform = this.context.get(TransformSystem).create()
        vec3.copy(target, effect.burn.transform.position)

        effect.wave.transform = this.context.get(TransformSystem).create()
        vec3.copy(target, effect.wave.transform.position)
        quat.axisAngle(vec3.AXIS_X, -0.5 * Math.PI, effect.wave.transform.rotation)
        this.context.get(PostEffectPass).add(effect.wave)

        effect.light = this.context.get(PointLightPass).create()
        effect.light.transform = this.context.get(TransformSystem).create()
        vec3.add(target, [0, 0.5, 0], effect.light.transform.position)
        vec3.set(1, 0.9, 0.5, effect.light.color)

        effect.particles = SharedSystem.particles.embers.add({
            uLifespan: [0.2,0.4,-0.2,0],
            uOrigin: target,
            uRotation: vec2.ZERO, uGravity: vec3(0,-9.8*2,0),
            uSize: [0.2,0.6],
            uRadius: [0.2,0.5],
            uOrientation: quat.IDENTITY,
            uForce: [8,16],
            uTarget: vec3.add(target, [0,-0.2,0], vec3()),
        })

        const duration = Math.sqrt(vec3.distanceSquared(origin, target)) * 0.05 / 2
        const animate = AnimationTimeline(effect, {
            'particles': EmitterTrigger({ frame: duration, value: 24*3 }),
            'trail': FollowTrail(effect.transform.position, vec2(0, 0), 0.5),
            'transform.position.1': PropertyAnimation([
                { frame: 0, value: origin[1] },
                { frame: duration, value: target[1], ease: ease.cubicIn }
            ], lerp),
            'transform.position': PropertyAnimation([
                { frame: 0, value: origin },
                { frame: duration, value: target, ease: ease.linear }
            ], vec3.lerp),
            'sphere.color': PropertyAnimation([
                { frame: duration + 0.1, value: vec4.ONE },
                { frame: duration + 0.6, value: vec4.ZERO, ease: ease.cubicIn }
            ], vec4.lerp),
            'sphere.transform.scale': PropertyAnimation([
                { frame: duration + 0.1, value: vec3.ZERO },
                { frame: duration + 0.6, value: [1.8,1.8,1.8], ease: ease.cubicOut }
            ], vec3.lerp),
            'glow.color': PropertyAnimation([
                { frame: duration, value: [1,0.9,0.6,0] },
                { frame: duration + 0.3, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp),
            'glow.transform.scale': PropertyAnimation([
                { frame: duration, value: vec3.ZERO},
                { frame: duration + 0.3, value: [8,8,8], ease: ease.quartOut }
            ], vec3.lerp),
            'burn.transform.scale': PropertyAnimation([
                { frame: duration, value: vec3.ZERO },
                { frame: duration + 0.1, value: [8,4,8], ease: ease.cubicOut }
            ], vec3.lerp),
            'burn.color': PropertyAnimation([
                { frame: duration + 1, value: [0,0,0,1] },
                { frame: duration + 2, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'light.radius': PropertyAnimation([
                { frame: duration, value: 0 },
                { frame: duration + 0.3, value: 4, ease: ease.cubicOut }
            ], lerp),
            'light.intensity': PropertyAnimation([
                { frame: duration, value: 8 },
                { frame: duration + 0.3, value: 0, ease: ease.sineIn }
            ], lerp),
            'wave.transform.scale': PropertyAnimation([
                { frame: duration + 0.1, value: vec3.ZERO },
                { frame: duration + 0.4, value: [8,8,8], ease: ease.quartOut }
            ], vec3.lerp),
            'wave.color': PropertyAnimation([
                { frame: duration + 0.1, value: [1,1,1,0.4] },
                { frame: duration + 0.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp)
        })

        for(const totalDuration = 2 + duration, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime    
            animate(elapsedTime, this.context.deltaTime)

            if(elapsedTime > totalDuration) break
            yield ActionSignal.WaitNextFrame
        }

        this.context.get(TransformSystem).delete(effect.transform)
        this.context.get(TransformSystem).delete(effect.glow.transform)
        this.context.get(TransformSystem).delete(effect.burn.transform)
        this.context.get(TransformSystem).delete(effect.light.transform)
        this.context.get(TransformSystem).delete(effect.sphere.transform)
        this.context.get(TransformSystem).delete(effect.wave.transform)

        SharedSystem.particles.embers.remove(effect.particles)
        this.context.get(PointLightPass).delete(effect.light)

        this.context.get(ParticleEffectPass).remove(effect.sphere)
        this.context.get(ParticleEffectPass).remove(effect.glow)
        this.context.get(ParticleEffectPass).remove(effect.trail)
        this.context.get(DecalPass).delete(effect.burn)
        this.context.get(PostEffectPass).remove(effect.wave)

        this.pool.push(effect)
    }
    private findTarget(direction: Direction): vec3 {
        const origin = this.cube.state.tile
        const terrain = this.context.get(TerrainSystem)
        const step = {
            [Direction.Up]: [0,1],
            [Direction.Left]: [1,0],
            [Direction.Down]: [0,-1],
            [Direction.Right]: [-1,0]
        }[direction]
        const limit = 4
        const tile = vec2()
        for(let i = 1; i <= limit; i++){
            vec2.scale(step, i, tile)
            vec2.add(origin, tile, tile)
            const entity = terrain.getTile(tile[0], tile[1])
            if(entity != null) return terrain.tilePosition(tile[0], tile[1], vec3())
        }
        return terrain.tilePosition(tile[0], tile[1], vec3())
    }
}