import { Application, One, Zero } from '../../engine/framework'
import { vec2, vec3, vec4, quat, randomInt, randomFloat, mulberry32 } from '../../engine/math'
import { ease } from '../../engine/animation'
import { GL, ShaderProgram, VertexDataFormat } from '../../engine/webgl'
import { ParticleEffectPass, DeferredGeometryPass } from '../../engine/pipeline'
import * as shaders from '../../engine/shaders'
import { MaterialSystem, EmitterMaterial, GradientRamp } from '../../engine/materials'
import {
    AttributeCurveSampler, ParticleGeometry, ParticleOvertimeAttributes,
    ParticleSystem, StaticParticleSystem
} from '../../engine/particles'
import * as localShaders from '../shaders'
import { SharedSystem } from './index'

export function ParticleLibrary(context: Application){
    const random = mulberry32()

    const energy = new ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uRotation: vec2
        uGravity: vec3
        uSize: vec2
        uRadius: vec2
        uForce: vec2
        uTarget: vec3
    }>(
        context, { limit: 512, format: VertexDataFormat.Particle },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
            ALIGNED: true, SOFT: false, MASK: false, GRADIENT: true, STRETCH: 0.04
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            SPHERE: true, TARGETED: true, LUT: true, RADIAL: true
        })
    )
    energy.material = new EmitterMaterial()
    energy.material.diffuse = SharedSystem.textures.blink
    energy.material.gradientRamp = GradientRamp(context.gl, [
        0x00000000, 0x3238317f, 0x264d3e3f, 0x8db8b600,
        0x00000000, 0x111c134f, 0x1d4a3b3f, 0x3f999600,
        0x00000000, 0x08120a2f, 0x0d261f2f, 0x395c5b1f,
        0x00000000, 0x00000000, 0x00000000, 0x00000000
    ], 4)
    energy.material.curveSampler = AttributeCurveSampler(context.gl, 32, 
        Object.values(<ParticleOvertimeAttributes> {
            size0: x => 1 - ease.quadIn(x),
            size1: x => 1 - ease.quartIn(x),
            linear0: x => 1 - 0.5 * ease.cubicIn(x),
            linear1: x => 1 - 0.5 * ease.cubicIn(x),
            rotational0: Zero, rotational1: Zero,
            radial0: x => 4 * ease.sineIn(x),
            radial1: x => 4 * ease.sineIn(x),
        })
    )

    const sparks = new ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uLength: vec2
        uGravity: vec3
        uSize: vec2
        uRadius: vec2
        uForce: vec2
        uTarget: vec3
    }>(
        context, { limit: 1024, format: VertexDataFormat.Particle },
        ParticleGeometry.stripe(context.gl, 8, (x: number) => x * 2),
        ShaderProgram(context.gl, shaders.stripe_vert, shaders.billboard_frag, {
            STRIP: true, SOFT: false, MASK: true, GRADIENT: true
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            SPHERE: true, TARGETED: true, STATIC: true, TRAIL: true
        })
    )
    sparks.material = new EmitterMaterial()
    sparks.material.diffuse = SharedSystem.textures.rectangle
    sparks.material.gradientRamp = GradientRamp(context.gl, [
        0x00000000, 0xc7fcf0af, 0x8ee3e67f, 0x4383ba3f, 0x21369400, 0x09115400,
        0x00000000, 0x81d4cd7f, 0x4f94a13f, 0x27588a00, 0x13236300, 0x060c3300,
        0x00000000, 0x2a828700, 0x204c7800, 0x101c5700, 0x06092b00, 0x00000000,
        0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000
    ], 4)

    const dust = new ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uGravity: vec3
        uRotation: vec2
        uAngular: vec4
        uSize: vec2
        uOrientation: quat
        uRadius: vec2
        uForce: vec2
        uTarget: vec3
    }>(
        context, { limit: 1024, format: VertexDataFormat.Particle },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
            SPHERICAL: true, SOFT: false, MASK: true, GRADIENT: true, UV_OFFSET: 0.2
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            CIRCLE: true, TARGETED: true, LUT: true, ANGULAR: true
        })
    )
    dust.material = new EmitterMaterial()
    dust.material.diffuse = SharedSystem.textures.cloudNoise
    dust.material.gradientRamp = GradientRamp(context.gl, [
        0xBFB9AEFF, 0x706A5FFF, 0x1917125f, 0x00000000,
        0x1917127f, 0x00000000, 0x00000000, 0x00000000
    ], 2)
    dust.material.curveSampler = AttributeCurveSampler(context.gl, 32, 
        Object.values(<ParticleOvertimeAttributes> {
            size0: ease.cubicOut, size1: ease.cubicOut,
            linear0: x => 1 - 0.2 * ease.linear(x),
            linear1: x => 1 - 0.2 * ease.linear(x),
            rotational0: x => 1 - 0.2 * ease.linear(x),
            rotational1: x => 1 - 0.2 * ease.linear(x),
            radial0: Zero, radial1: Zero,
        })
    )

    const smoke = new ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uGravity: vec3
        uRotation: vec2
        uSize: vec2
        uFieldDomain: vec4
        uFieldStrength: vec2
    }>(
        context, { limit: 1024, format: VertexDataFormat.Particle },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, localShaders.smoke_frag, {
            SPHERICAL: true, MASK: true, GRADIENT: true
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            LUT: true, VECTOR_FIELD: true
        })
    )
    smoke.material = new EmitterMaterial()
    smoke.material.diffuse = SharedSystem.textures.sineNoise
    smoke.material.gradientRamp = GradientRamp(context.gl, [
        0x0A0A1AAF, 0x0E0E107F, 0x1A1A1F3F, 0x00000000,
        0x00000000, 0x00000000, 0x00000000, 0x00000000
    ], 2)
    smoke.material.curveSampler = AttributeCurveSampler(context.gl, 32, 
        Object.values(<ParticleOvertimeAttributes> {
            size0: ease.linear, size1: ease.quadOut,
            linear0: x => 0.98, linear1: x => 0.98,
            rotational0: Zero, rotational1: Zero,
            radial0: Zero, radial1: Zero,
        })
    )

    const bolts = new ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uRadius: vec2
        uOrientation: quat
        uGravity: vec3
        uRotation: vec2
        uSize: vec2
        uFrame: vec2
    }>(
        context, { limit: 1024, format: VertexDataFormat.Particle },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
            FRAMES: true, SWIPE: 0.1
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            CIRCLE: true, FRAMES: true
        })
    )
    bolts.material = new EmitterMaterial()
    bolts.material.diffuse = SharedSystem.textures.lightning

    const embers = new ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uRotation: vec2
        uGravity: vec3
        uSize: vec2
        uRadius: vec2
        uOrientation: quat
        uForce: vec2
        uTarget: vec3
    }>(
        context, { limit: 512, format: VertexDataFormat.Particle },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
            ALIGNED: true, GRADIENT: true, STRETCH: 0.04
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            CIRCLE: true, TARGETED: true, LUT: true
        })
    )
    embers.material = new EmitterMaterial()
    embers.material.diffuse = SharedSystem.textures.particle
    embers.material.gradientRamp = GradientRamp(context.gl, [
        0xffffff00, 0xfaf8ca00, 0xf2d57c00, 0xcf8f4210, 0xb3461730, 0x82100820, 0x30030010, 0x00000000,
        0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000
    ], 2)
    embers.material.curveSampler = AttributeCurveSampler(context.gl, 32, 
        Object.values(<ParticleOvertimeAttributes> {
            size0: x => 1 - ease.sineIn(x),
            size1: x => 1 - ease.quadIn(x),
            linear0: x => 0.98, linear1: x => 0.96,
            rotational0: Zero, rotational1: Zero,
            radial0: Zero, radial1: Zero,
        })
    )

    const fire = new ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uRotation: vec2
        uGravity: vec3
        uSize: vec2
        uRadius: vec2
    }>(
        context, { limit: 512, format: VertexDataFormat.Particle },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, localShaders.fire_frag, {
            ALIGNED: true
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            SPHERE: true, RELATIVE: true
        })
    )
    fire.material = new EmitterMaterial()
    fire.material.diffuse = SharedSystem.textures.noise

    const spikes = new ParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uRotation: vec2
        uGravity: vec3
        uSize: vec2
        uRadius: vec2
        uForce: vec2
        uTarget: vec3
        uFrame: vec2
    }>(
        context, { limit: 256, format: VertexDataFormat.Particle },
        ParticleGeometry.board(context.gl, 0.2),
        ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
            ALIGNED: true, GRADIENT: true, FRAMES: true
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            SPHERE: true, TARGETED: true, LUT: true, FRAMES: true
        })
    )
    spikes.material = new EmitterMaterial()
    spikes.material.diffuse = SharedSystem.textures.spike
    spikes.material.gradientRamp = GradientRamp(context.gl, [
        0xedecd100, 0x6b2d47ff,
        0xc7264b70, 0x422e36d0,
        0x75132950, 0x261d22a0,
        0x00000000, 0x00000000
    ], 4)
    spikes.material.curveSampler = AttributeCurveSampler(context.gl, 32, 
        Object.values(<ParticleOvertimeAttributes> {
            size0: x => Math.sqrt(ease.fadeInOut(ease.cubicOut(x))),
            size1: x => Math.sqrt(ease.fadeInOut(ease.cubicOut(x))),
            linear0: ease.reverse(ease.sineIn), linear1: ease.reverse(ease.sineIn),
            rotational0: Zero, rotational1: Zero, radial0: Zero, radial1: Zero,
        })
    )

    const glow = new StaticParticleSystem<{
        uLifespan: vec4
        uOrigin: vec3
        uGravity: vec3
        uSize: vec2
        uRadius: vec2
    }>(
        context, { limit: 512, format: VertexDataFormat.Particle },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.verlet_vert, shaders.billboard_frag, {
            SPHERICAL: true, GRADIENT: true, VECTOR_FIELD: true, LUT: true
        }), {
            aLifetime(options, offset, buffer){
                buffer[offset + 0] = context.currentTime - randomFloat(options.uLifespan[2], options.uLifespan[3], random())
                buffer[offset + 1] = randomFloat(options.uLifespan[0], options.uLifespan[1], random())
                buffer[offset + 2] = random()
                buffer[offset + 3] = -options.uLifespan[2]
            },
            aSize(options, offset, buffer){
                buffer[offset + 0] = buffer[offset + 1] = randomFloat(options.uSize[0], options.uSize[1], random())
                buffer[offset + 2] = 0
                buffer[offset + 3] = 1
            },
            aTransform(options, offset, buffer){
                const angle = randomFloat(0, 2 * Math.PI, random())
                const radius = randomFloat(options.uRadius[0], options.uRadius[1], random())
                const nx = radius * Math.cos(angle), nz = radius * Math.sin(angle)

                buffer[offset + 0] = options.uOrigin[0] + nx
                buffer[offset + 1] = options.uOrigin[1]
                buffer[offset + 2] = options.uOrigin[2] + nz
                buffer[offset + 3] = 0
            },
            aVelocity(options, offset, buffer){
                buffer[offset + 0] = buffer[offset + 1] = buffer[offset + 2] = buffer[offset + 3] = 0
            },
            aAcceleration(options, offset, buffer){
                buffer[offset + 0] = options.uGravity[0]
                buffer[offset + 1] = options.uGravity[1]
                buffer[offset + 2] = options.uGravity[2]
                buffer[offset + 3] = 0
            }
        }
    )
    glow.material = new EmitterMaterial()
    glow.material.diffuse = SharedSystem.textures.glow
    glow.material.gradientRamp = GradientRamp(context.gl, [
        0xf7f7eb00, 0x95958fd0,
        0xd8da9a10, 0x5b5265a0,
        0x47374340, 0x33282e80,
        0x00000000, 0x00000000
    ], 4)
    glow.material.curveSampler = AttributeCurveSampler(context.gl, 32, 
        Object.values(<ParticleOvertimeAttributes> {
            size0: ease.fadeInOut,
            size1: ease.fadeInOut,
            displacement0: ease.quadIn,
            displacement1: ease.sineIn
        })
    )
    glow.material.displacementMap = SharedSystem.textures.perlinNoise

    const foliage = new StaticParticleSystem<{
        uOrigin: vec3[]
        uRadius: vec2
        uSize: vec2
    }>(
        context, { limit: 2048, format: VertexDataFormat.StaticParticle },
        ParticleGeometry.board(context.gl, 0.2),
        ShaderProgram(context.gl, localShaders.grass_vert, localShaders.foliage_frag, {
            FRAMES: true
        }), {
            aLifetime(options, offset, buffer){
                buffer[offset + 0] = context.currentTime
                buffer[offset + 1] = 0
                buffer[offset + 2] = random()
                buffer[offset + 3] = 2
            },
            aTransform(options, offset, buffer){
                const origin = options.uOrigin[randomInt(0, options.uOrigin.length - 1, random())]
                const radius = randomFloat(options.uRadius[0], options.uRadius[1], random()*random())
                const angle = randomFloat(0, 2 * Math.PI, random())

                buffer[offset + 0] = origin[0] + radius * Math.cos(angle)
                buffer[offset + 2] = origin[2] + radius * Math.sin(angle)
                buffer[offset + 1] = origin[1]
                buffer[offset + 3] = 0
            },
            aSize(options, offset, buffer){
                buffer[offset + 0] = buffer[offset + 1] = randomFloat(options.uSize[0], options.uSize[1], random())
                buffer[offset + 2] = 0
                buffer[offset + 3] = 2
            }
        }
    )
    foliage.material = new EmitterMaterial()
    foliage.material.blendMode = null
    foliage.material.cullFace = GL.NONE
    foliage.material.depthWrite = true
    foliage.material.diffuse = SharedSystem.textures.plant

    context.get(ParticleEffectPass).effects.push(glow, dust, spikes, smoke, energy, sparks, bolts, embers, fire)
    context.get(DeferredGeometryPass).effects.push(foliage)
    return { foliage, glow, dust, spikes, smoke, energy, sparks, bolts, embers, fire }
}