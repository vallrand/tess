import { Application, One, Zero } from '../../engine/framework'
import { vec2, vec3, vec4, ease, quat } from '../../engine/math'
import { GL, ShaderProgram, VertexDataFormat } from '../../engine/webgl'
import { ParticleEffectPass } from '../../engine/pipeline/ParticleEffectPass'
import { shaders } from '../../engine/shaders'
import { MaterialSystem } from '../../engine/materials/Material'
import { AttributeCurveSampler, GradientRamp, ParticleGeometry, ParticleOvertimeAttributes, ParticleSystem } from '../../engine/particles'
import { SharedSystem } from './index'

export function ParticleLibrary(context: Application){
    const materials = context.get(MaterialSystem)

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
        context, { limit: 512, format: VertexDataFormat.Particle, depthTest: GL.LEQUAL, depthWrite: false, cull: GL.NONE, blend: 0 },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
            ALIGNED: true, SOFT: false, MASK: false, GRADIENT: true, STRETCH: 0.04
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            SPHERE: true, TARGETED: true, LUT: true, RADIAL: true
        })
    )
    energy.diffuse = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { BLINK: true }), {
                uColor: [1,1,1,1]
            }, 0
    ).target
    energy.gradientRamp = GradientRamp(context.gl, [
        0x00000000, 0x3238317f, 0x264d3e3f, 0x8db8b600,
        0x00000000, 0x111c134f, 0x1d4a3b3f, 0x3f999600,
        0x00000000, 0x08120a2f, 0x0d261f2f, 0x395c5b1f,
        0x00000000, 0x00000000, 0x00000000, 0x00000000
    ], 4)
    energy.curveSampler = AttributeCurveSampler(context.gl, 32, 
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
        context, { limit: 1024, format: VertexDataFormat.Particle, depthTest: GL.LEQUAL, depthWrite: false, cull: GL.NONE, blend: 0 },
        ParticleGeometry.stripe(context.gl, 8, (x: number) => x * 2),
        ShaderProgram(context.gl, shaders.stripe_vert, shaders.billboard_frag, {
            STRIP: true, SOFT: false, MASK: true, GRADIENT: true
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            SPHERE: true, TARGETED: true, STATIC: true, TRAIL: true
        })
    )
    sparks.diffuse = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert,
            require('../shaders/shape_frag.glsl'), { ROUNDED_BOX: true }), {
                uColor: [1,1,1,1], uRadius: 0.4, uSize: 0.2
            }, 0
    ).target
    sparks.gradientRamp = GradientRamp(context.gl, [
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
        context, { limit: 1024, format: VertexDataFormat.Particle, depthTest: GL.LEQUAL, depthWrite: false, cull: GL.NONE, blend: 0 },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
            SPHERICAL: true, SOFT: false, MASK: true, GRADIENT: true, UV_OFFSET: 0.2
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            CIRCLE: true, TARGETED: true, LUT: true, ANGULAR: true
        })
    )
    dust.diffuse = SharedSystem.textures.cloudNoise
    dust.gradientRamp = GradientRamp(context.gl, [
        0xBFB9AEFF, 0x706A5FFF, 0x1917125f, 0x00000000,
        0x1917127f, 0x00000000, 0x00000000, 0x00000000
    ], 2)
    dust.curveSampler = AttributeCurveSampler(context.gl, 32, 
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
    }>(
        context, { limit: 1024, format: VertexDataFormat.Particle, depthTest: GL.LEQUAL, depthWrite: false, cull: GL.NONE, blend: 0 },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, require('../shaders/smoke_frag.glsl'), {
            SPHERICAL: true, MASK: true, GRADIENT: true
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, { LUT: true })
    )
    smoke.diffuse = SharedSystem.textures.sineNoise
    smoke.gradientRamp = GradientRamp(context.gl, [
        0x0A0A1AAF, 0x0E0E107F, 0x1A1A1F3F, 0x00000000,
        0x00000000, 0x00000000, 0x00000000, 0x00000000
    ], 2)
    smoke.curveSampler = AttributeCurveSampler(context.gl, 32, 
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
        context, { limit: 1024, format: VertexDataFormat.Particle, depthTest: GL.LEQUAL, depthWrite: false, cull: GL.NONE, blend: 0 },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
            FRAMES: true, SWIPE: 0.1
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            CIRCLE: true, FRAMES: true
        })
    )
    bolts.diffuse = materials.addRenderTexture(
        materials.createRenderTexture(128, 128, 1, { wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE, format: GL.RGBA8 }), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, require('../shaders/lightning_frag.glsl'), {
        }), {
            uTiles: 4
        }, 0
    ).target

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
        context, { limit: 516, format: VertexDataFormat.Particle, depthTest: GL.LEQUAL, depthWrite: false, cull: GL.NONE, blend: 0 },
        ParticleGeometry.quad(context.gl),
        ShaderProgram(context.gl, shaders.billboard_vert, shaders.billboard_frag, {
            ALIGNED: true, GRADIENT: true, STRETCH: 0.04
        }),
        ShaderProgram(context.gl, shaders.particle_vert, null, {
            CIRCLE: true, TARGETED: true, LUT: true
        })
    )
    embers.diffuse = SharedSystem.textures.particle
    embers.gradientRamp = GradientRamp(context.gl, [
        0xffffff00, 0xfaf8ca00, 0xf2d57c00, 0xcf8f4210, 0xb3461730, 0x82100820, 0x30030010, 0x00000000,
        0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000, 0x00000000
    ], 2)
    embers.curveSampler = AttributeCurveSampler(context.gl, 32, 
        Object.values(<ParticleOvertimeAttributes> {
            size0: x => 1 - ease.sineIn(x),
            size1: x => 1 - ease.quadIn(x),
            linear0: x => 0.98, linear1: x => 0.96,
            rotational0: Zero, rotational1: Zero,
            radial0: Zero, radial1: Zero,
        })
    )

    context.get(ParticleEffectPass).effects.push(dust, smoke, energy, sparks, bolts, embers)
    return { dust, smoke, energy, sparks, bolts, embers }
}