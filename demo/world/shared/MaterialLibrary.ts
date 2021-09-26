import { Application } from '../../engine/framework'
import { vec2, vec3, vec4 } from '../../engine/math'
import { ShaderProgram, GL } from '../../engine/webgl'
import { shaders } from '../../engine/shaders'
import { GradientRamp } from '../../engine/particles'
import { MaterialSystem, MeshMaterial, EffectMaterial, SpriteMaterial, DecalMaterial } from '../../engine/materials'
import { DeferredGeometryPass, ParticleEffectPass, DecalPass } from '../../engine/pipeline'
import { SharedSystem } from '../shared'

export function MaterialLibrary(context: Application){
    const materials = context.get(MaterialSystem)

    const distortion = ShaderProgram(context.gl, shaders.batch_vert, shaders.distortion_frag, {})

    const chromaticAberration = ShaderProgram(context.gl, shaders.batch_vert, shaders.distortion_frag, {
        CHROMATIC_ABERRATION: true
    })

    const dunesMaterial = new MeshMaterial()
    dunesMaterial.program = context.get(DeferredGeometryPass).programs[0]
    dunesMaterial.diffuse = materials.addRenderTexture(
        materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, require('../shaders/sandstone_frag.glsl')), {
            uScreenSize: [MaterialSystem.textureSize, MaterialSystem.textureSize]
        }, 0
    ).target
    dunesMaterial.normal = materials.addRenderTexture(
        materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, require('../shaders/dunes_frag.glsl')), {
            uScreenSize: [MaterialSystem.textureSize, MaterialSystem.textureSize]
        }, 0
    ).target



    const coneTealMaterial = new EffectMaterial(context.gl, {
        VERTICAL_MASK: true, PANNING: true, GREYSCALE: true, GRADIENT: true
    }, {
        uUVTransform: vec4(0,0,2,0.2),
        uVerticalMask: vec4(0,0.5,0,0),
        uUVPanning: vec2(-0.2, -0.4),
        uUV2Transform: vec4(0,0,1,0.5),
        uUV2Panning: vec2(0.3, -0.7),
        uColorAdjustment: vec3(1,0.8,0)
    })
    coneTealMaterial.diffuse = SharedSystem.textures.cellularNoise
    coneTealMaterial.gradient = GradientRamp(context.gl, [
        0xffffff00, 0xdeffee00, 0x8ad4ad10, 0x68d4a820, 0x1aa17130, 0x075c4f20, 0x03303820, 0x00000000,
    ], 1)


    const absorbTealMaterial = new EffectMaterial(context.gl, {
        PANNING: true, VERTICAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uVerticalMask: vec4(0,0.9,0.9,1),
        uUVTransform: vec4(0,0,1,1),
        uUVPanning: vec2(0,-0.32),
        uUV2Transform: vec4(0,0,1,1),
        uUV2Panning: vec2(0,-0.64),
        uColorAdjustment: vec3(1.4,0.9,0)
    })
    absorbTealMaterial.gradient = GradientRamp(context.gl, [
        0xFFFFFF00, 0xFFFFFF00, 0xEFF4F705, 0xC9DBE412, 0x99C7D44C, 0x5AA4AD9D, 0x1E51527B, 0x00000000
    ], 1)
    absorbTealMaterial.diffuse = SharedSystem.textures.directionalNoise


    const stripesMaterial = new EffectMaterial(context.gl, {
        FRESNEL: true, PANNING: true, VERTICAL_MASK: true
    }, {
        uUVTransform: vec4(0,0,1,1),
        uUVPanning: vec2(0, -0.6),
        uVerticalMask: vec4(0,0,0.8,1),
        uFresnelMask: vec2(0.1,0.5)
    })
    stripesMaterial.diffuse = SharedSystem.textures.stripes



    const gradientMaterial = new SpriteMaterial()
    gradientMaterial.program = context.get(ParticleEffectPass).program
    gradientMaterial.diffuse = GradientRamp(context.gl, [
        0x00000000, 0xffffffff
    ], 2)

    const dissolveProgram = ShaderProgram(context.gl, shaders.geometry_vert, shaders.geometry_frag, {
        SKINNING: true, NORMAL_MAPPING: true, COLOR_INDEX: true, DISSOLVE: true
    })
    dissolveProgram.uniforms.uDissolveDirection = vec3(0,-1,0)
    dissolveProgram.uniforms.uDissolveThreshold = 0.36
    dissolveProgram.uniforms.uDissolveColor = vec4(1.0,0.2,0.4,0.8)
    dissolveProgram.uniforms.uDissolveUVScale = vec3(16,16, 0.8)


    const beamLinearProgram = ShaderProgram(context.gl, shaders.batch_vert, require('../shaders/beam_frag.glsl'))
    const beamRadialProgram = ShaderProgram(context.gl, shaders.batch_vert, require('../shaders/beam_frag.glsl'), { RADIAL: true })



    const stripesBlockyMaterial = new EffectMaterial(context.gl, {
        VERTICAL_MASK: true, PANNING: true, HALF: true, DISSOLVE: true, GRADIENT: true, DISPLACEMENT: true
    }, {
        uUVTransform: vec4(0,0,1,1.4),
        uUVPanning: vec2(-0.2, -0.4),
        uVerticalMask: vec4(0.2,0.4,0.4,1.0),
        uDissolveColor: vec4(1,0.2,0.4,0.8),
        uDissolveThreshold: vec3(0.1,0.02,0.1),
        uDisplacementAmount: [0.08],
        uUV3Transform: vec4(0,0,1,3),
        uUV3Panning: vec2(0,0.1)
    })
    stripesBlockyMaterial.diffuse = SharedSystem.textures.boxStripes
    stripesBlockyMaterial.gradient = GradientRamp(context.gl, [ 0xffffffff, 0x00000000 ], 1)
    stripesBlockyMaterial.displacement = SharedSystem.textures.boxStripes


    const glowSquaresLinearMaterial = new DecalMaterial()
    glowSquaresLinearMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, require('../shaders/charger_frag.glsl'), {
        INSTANCED: true
    })
    glowSquaresLinearMaterial.program.uniforms['uLayer'] = glowSquaresLinearMaterial.layer
    glowSquaresLinearMaterial.program.uniforms['uDissolveEdge'] = 1

    const glowSquaresRadialMaterial = new DecalMaterial()
    glowSquaresRadialMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, require('../shaders/charger_frag.glsl'), {
        INSTANCED: true, POLAR: true
    })
    glowSquaresRadialMaterial.program.uniforms['uLayer'] = glowSquaresRadialMaterial.layer
    glowSquaresRadialMaterial.program.uniforms['uDissolveEdge'] = 1

    const reticleMaterial = new DecalMaterial()
    reticleMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, require('../shaders/reticle_frag.glsl'), {
        INSTANCED: true
    })
    reticleMaterial.program.uniforms['uLayer'] = reticleMaterial.layer


    const trailSmokeMaterial = new EffectMaterial(context.gl, {
        PANNING: true, HORIZONTAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uHorizontalMask: vec4(0,0.4,0.6,1.0),
        uUVTransform: vec4(0,0,0.4,1.7),
        uUVPanning: vec2(-0.1,0.7+0.4),
        uUV2Transform: vec4(0,0,0.7,1.5),
        uUV2Panning: vec2(0.1,0.5+0.4),
        uColorAdjustment: vec3(1,0.8,0.2)
    })
    trailSmokeMaterial.gradient = GradientRamp(context.gl, [
        0xd5f5f500, 0x9c386f20, 0x42172510, 0x00000000,
        0x50505fff, 0x20202fff, 0x0a0a0fff, 0x00000000,
        0x30303fff, 0x10101fff, 0x0a0a0fff, 0x00000000,
        0x000000ff, 0x000000af, 0x0000007f, 0x00000000
    ], 4)
    trailSmokeMaterial.diffuse = SharedSystem.textures.cloudNoise

    //TODO material duplicated from artillery, textures are different though? reuse only shader?
    const exhaustYellowMaterial = new EffectMaterial(context.gl, {
        PANNING: true, VERTICAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uVerticalMask: vec4(0,0.4,0.6,0.8),
        uUVTransform: vec4(-0.1,0,1,0.5),
        uUVPanning: vec2(-0.1,1.4),
        uUV2Transform: vec4(0,0,1,0.7),
        uUV2Panning: vec2(0.2, 1.8),
        uColorAdjustment: vec3(2.0,2.0,0.2)
    })
    exhaustYellowMaterial.gradient = SharedSystem.gradients.yellowViolet
    exhaustYellowMaterial.diffuse = SharedSystem.textures.cloudNoise
   

    return {
        distortion, chromaticAberration, dunesMaterial, dissolveProgram,

        coneTealMaterial, gradientMaterial, absorbTealMaterial, stripesMaterial,
        beamLinearProgram, beamRadialProgram, stripesBlockyMaterial,

        glowSquaresLinearMaterial, glowSquaresRadialMaterial, reticleMaterial, trailSmokeMaterial,
        exhaustYellowMaterial
    }
}