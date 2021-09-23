import { Application } from '../../engine/framework'
import { vec2, vec3, vec4 } from '../../engine/math'
import { ShaderProgram } from '../../engine/webgl'
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


    const gradientMaterial = new SpriteMaterial()
    gradientMaterial.program = context.get(ParticleEffectPass).program
    gradientMaterial.diffuse = GradientRamp(context.gl, [
        0x00000000, 0xffffffff
    ], 2)

    return {
        distortion, chromaticAberration, dunesMaterial,

        coneTealMaterial, gradientMaterial
    }
}