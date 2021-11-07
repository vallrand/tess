import { Application } from '../../engine/framework'
import { vec2, vec3, vec4 } from '../../engine/math'
import { ShaderProgram, GL, OpaqueLayer, createTexture } from '../../engine/webgl'
import * as shaders from '../../engine/shaders'
import * as localShaders from '../shaders'
import { MaterialSystem, ShaderMaterial, MeshMaterial, EffectMaterial, SpriteMaterial, DecalMaterial } from '../../engine/materials'
import { DeferredGeometryPass, ParticleEffectPass, DecalPass } from '../../engine/pipeline'
import { SharedSystem } from '../shared'

function EffectMaterials(gl: WebGL2RenderingContext){
    const coneTealMaterial = new EffectMaterial(gl, {
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
    coneTealMaterial.gradient = SharedSystem.gradients.teal

    const absorbTealMaterial = new EffectMaterial(gl, {
        PANNING: true, VERTICAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uVerticalMask: vec4(0,0.9,0.9,1),
        uUVTransform: vec4(0,0,1,1),
        uUVPanning: vec2(0,-0.32),
        uUV2Transform: vec4(0,0,1,1),
        uUV2Panning: vec2(0,-0.64),
        uColorAdjustment: vec3(1.4,0.9,0)
    })
    absorbTealMaterial.diffuse = SharedSystem.textures.directionalNoise
    absorbTealMaterial.gradient = SharedSystem.gradients.darkTeal

    const stripesMaterial = new EffectMaterial(gl, {
        FRESNEL: true, PANNING: true, VERTICAL_MASK: true
    }, {
        uUVTransform: vec4(0,0,1,1),
        uUVPanning: vec2(0, -0.6),
        uVerticalMask: vec4(0,0,0.8,1),
        uFresnelMask: vec2(0.1,0.5)
    })
    stripesMaterial.diffuse = SharedSystem.textures.stripes

    const auraTealMaterial = new EffectMaterial(gl, {
        VERTICAL_MASK: true, PANNING: true, GREYSCALE: true, GRADIENT: true, POLAR: true, DEPTH_OFFSET: 5.2
    }, {
        uUVTransform: vec4(0,0,1,0.8),
        uVerticalMask: vec4(0.2,0.4,0.6,1),
        uUVPanning: vec2(0.2, -0.1),
        uUV2Transform: vec4(0,0,1,1.6),
        uUV2Panning: vec2(-0.2, -0.3),
        uColorAdjustment: vec3(1,0.9,0)
    })
    auraTealMaterial.diffuse = SharedSystem.textures.cellularNoise
    auraTealMaterial.gradient = SharedSystem.gradients.teal

    const energyHalfPurpleMaterial = new EffectMaterial(gl, {
        VERTICAL_MASK: true, PANNING: true, HALF: true, GREYSCALE: true, GRADIENT: true
    }, {
        uUVTransform: vec4(0,0,1,0.3),
        uUVPanning: vec2(0.2, -0.2),
        uVerticalMask: vec4(0.0,0.4,0.6,1.0),
        uColorAdjustment: vec3(3,1,0),
        uUV2Transform: vec4(0,0,1,0.6),
        uUV2Panning: vec2(-0.2, -0.3)
    })
    energyHalfPurpleMaterial.diffuse = SharedSystem.textures.voronoiNoise
    energyHalfPurpleMaterial.gradient = SharedSystem.gradients.purple

    const flashYellowMaterial = new EffectMaterial(gl, {
        POLAR: true, VERTICAL_MASK: true, PANNING: true, GRADIENT: true, DISSOLVE: true, GREYSCALE: true
    }, {
        uUVTransform: vec4(0.1,0,2,2.4),
        uUV2Transform: vec4(0.3,0,1.0,0.6),
        uColorAdjustment: vec3(1,0.8,0),
        uUVPanning: vec2(0,-0.8),
        uUV2Panning: vec2(0.1,-0.2),
        uVerticalMask: vec4(0.2,0.5,0.8,1.0),
        uDissolveColor: vec4(1,0,0,1),
        uDissolveThreshold: vec3(0.2,0,0)
    })
    flashYellowMaterial.diffuse = SharedSystem.textures.cellularNoise
    flashYellowMaterial.gradient = SharedSystem.gradients.yellowViolet

    const coreYellowMaterial = new EffectMaterial(gl, {
        PANNING: true, GRADIENT: true, DISSOLVE: true, GREYSCALE: true, VERTICAL_MASK: true, FRESNEL: true
    }, {
        uUVTransform: vec4(0,0,1,1.8),
        uUVPanning: vec2(-0.3,0),
        uDissolveColor: vec4.ZERO,
        uDissolveThreshold: vec3(0,0.04,0),
        uColorAdjustment: vec3(1,0.8,0),
        uUV2Transform: vec4(0.71,0.29,1,3.8),
        uUV2Panning: vec2(-0.5,0.2),
        uVerticalMask: vec4(0.2,0.5,0.8,1.0),
        uFresnelMask: vec2(0.1,0.5)
    })
    coreYellowMaterial.diffuse = SharedSystem.textures.cellularNoise
    coreYellowMaterial.gradient = SharedSystem.gradients.yellowRed2D

    const coreWhiteMaterial = new EffectMaterial(gl, {
        FRESNEL: true, PANNING: true, GRADIENT: true, GREYSCALE: true
    }, {
        uUVTransform: vec4(0,0,2,1.7),
        uUVPanning: vec2(-0.1,0.9),
        uFresnelMask: vec2(0.2,0.6),
        uColorAdjustment: vec3(1,0.9,0),
        uUV2Transform: vec4(0,0.7,3,2.9),
        uUV2Panning: vec2(0.1,0.7),
    })
    coreWhiteMaterial.diffuse = SharedSystem.textures.sineNoise
    coreWhiteMaterial.gradient = SharedSystem.gradients.brightRed

    const ringDustMaterial = new EffectMaterial(gl, {
        PANNING: true, GRADIENT: true, DISSOLVE: true, GREYSCALE: true, VERTICAL_MASK: true
    }, {
        uUVTransform: vec4(0,0,1,0.6),
        uUVPanning: vec2(-0.3,-0.04),
        uDissolveColor: vec4.ZERO,
        uDissolveThreshold: vec3(0,0.04,0),
        uColorAdjustment: vec3(1,0.64,0.1),
        uUV2Transform: vec4(0,0,1,1.7),
        uUV2Panning: vec2(-0.5,0.1),
        uVerticalMask: vec4(0.0,0.1,0.9,1.0),
    })
    ringDustMaterial.diffuse = SharedSystem.textures.cellularNoise
    ringDustMaterial.gradient = SharedSystem.gradients.orange2D

    const stripesRedMaterial = new EffectMaterial(gl, {
        PANNING: true, GREYSCALE: true, GRADIENT: true, VERTICAL_MASK: true
    }, {
        uUVTransform: vec4(0,0,3,2),
        uUVPanning: vec2(-0.4,-0.8),
        uColorAdjustment: vec3(1,1,0),
        uUV2Transform: vec4(0,0.04,2,2),
        uUV2Panning: vec2(0.4,-0.8),
        uVerticalMask: vec4(0.0,0.5,0.8,1.0),
    })
    stripesRedMaterial.diffuse = SharedSystem.textures.blocklines
    stripesRedMaterial.gradient = SharedSystem.gradients.darkRed

    const stripesBlockyMaterial = new EffectMaterial(gl, {
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
    stripesBlockyMaterial.diffuse = SharedSystem.textures.blocklines
    stripesBlockyMaterial.gradient = SharedSystem.gradients.white
    stripesBlockyMaterial.displacement = SharedSystem.textures.blocklines

    const trailSmokeMaterial = new EffectMaterial(gl, {
        PANNING: true, HORIZONTAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uHorizontalMask: vec4(0,0.4,0.6,1.0),
        uUVTransform: vec4(0,0,0.4,1.7),
        uUVPanning: vec2(-0.1,0.7+0.4),
        uUV2Transform: vec4(0,0,0.7,1.5),
        uUV2Panning: vec2(0.1,0.5+0.4),
        uColorAdjustment: vec3(1,0.8,0.2)
    })
    trailSmokeMaterial.gradient = SharedSystem.gradients.purpleGrey2D
    trailSmokeMaterial.diffuse = SharedSystem.textures.cloudNoise

    const trailEnergyMaterial = new EffectMaterial(gl, {
        PANNING: true, HORIZONTAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uHorizontalMask: vec4(0,0.5,0.5,1.0),
        uUVTransform: vec4(0,0,0.4,1),
        uUVPanning: vec2(0.04,-0.6),
        uUV2Transform: vec4(0,0,0.25,0.8),
        uUV2Panning: vec2(-0.08,-0.4),
        uColorAdjustment: vec3(1,1.2,0.1)
    })
    trailEnergyMaterial.diffuse = SharedSystem.textures.sineNoise
    trailEnergyMaterial.gradient = SharedSystem.gradients.purple

    const energyPurpleMaterial = new EffectMaterial(gl, {
        PANNING: true, VERTICAL_MASK: true, FRESNEL: true, GRADIENT: true, DISPLACEMENT: true
    }, {
        uUVTransform: vec4(0,0,1,0.6),
        uUVPanning: vec2(0,0.16),
        uVerticalMask: vec4(0.0,0.2,0.8,1.0),
        uFresnelMask: vec2(1.2,0.5),
        uDisplacementAmount: [0.1],
        uUV3Transform: vec4(0,0,1,1),
        uUV3Panning: vec2(0,-0.2)
    })
    energyPurpleMaterial.diffuse = SharedSystem.textures.sineNoise
    energyPurpleMaterial.gradient = SharedSystem.gradients.purple
    energyPurpleMaterial.displacement = SharedSystem.textures.perlinNoise

    const planeDissolveMaterial = new EffectMaterial(gl, {
        GRADIENT: true, DISSOLVE: true, DISPLACEMENT: true, PANNING: true
    }, {
        uUVTransform: vec4(0,0,1,1),
        uUVPanning: vec2(0,0.1),
        uDissolveColor: vec4(1,0.8,0.6,1),
        uDissolveThreshold: vec3(0,0.01,0.2),
        uDisplacementAmount: [0.05],
        uUV3Transform: vec4(0,0,1,1),
        uUV3Panning: vec2(0,0.2)
    })
    planeDissolveMaterial.diffuse = SharedSystem.textures.sineNoise
    planeDissolveMaterial.gradient = SharedSystem.gradients.white
    planeDissolveMaterial.displacement = SharedSystem.textures.perlinNoise

    const exhaustMaterial = new EffectMaterial(gl, {
        PANNING: true, VERTICAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uVerticalMask: vec4(0,0.4,0.6,0.8),
        uUVTransform: vec4(-0.1,0,1,0.5),
        uUVPanning: vec2(-0.1,1.4),
        uUV2Transform: vec4(0,0,1,0.7),
        uUV2Panning: vec2(0.2, 1.8),
        uColorAdjustment: vec3(2.0,2.0,0.2)
    })
    exhaustMaterial.diffuse = SharedSystem.textures.cellularNoise
    exhaustMaterial.gradient = SharedSystem.gradients.brightPurple

    return {
        coneTealMaterial, absorbTealMaterial, stripesMaterial, auraTealMaterial, energyHalfPurpleMaterial,
        flashYellowMaterial, coreYellowMaterial, coreWhiteMaterial,
        ringDustMaterial, stripesRedMaterial, stripesBlockyMaterial, trailSmokeMaterial, trailEnergyMaterial,
        energyPurpleMaterial, planeDissolveMaterial, exhaustMaterial,
    }
}

export function MaterialLibrary(context: Application){
    const materials = context.get(MaterialSystem)

    const mossMaterial = new DecalMaterial()
    mossMaterial.program = context.get(DecalPass).program
    mossMaterial.diffuse = SharedSystem.textures.moss

    const resourceSpotMaterial = new DecalMaterial()
    resourceSpotMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, require('../shaders/spot_frag.glsl'), {
        INSTANCED: true, ALPHA_CUTOFF: 0.01
    })
    resourceSpotMaterial.program.uniforms['uLayer'] = OpaqueLayer.Terrain

    const heatDistortion = ShaderProgram(context.gl, shaders.batch_vert, shaders.distortion_frag, {
        PANNING: true, VERTICAL_MASK: true
    })
    heatDistortion.uniforms['uDistortionStrength'] = 0.01
    heatDistortion.uniforms['uUVTransform'] = vec4(0,0,4,2)
    heatDistortion.uniforms['uUVPanning'] = vec2(0,-0.8)
    heatDistortion.uniforms['uVerticalMask'] = vec4(0.0,0.2,0.8,1.0)

    const distortion = ShaderProgram(context.gl, shaders.batch_vert, shaders.distortion_frag, {})
    distortion.uniforms['uDistortionStrength'] = 0.01

    const chromaticAberration = ShaderProgram(context.gl, shaders.batch_vert, shaders.distortion_frag, {
        CHROMATIC_ABERRATION: true
    })
    chromaticAberration.uniforms['uDistortionStrength'] = 0.01

    const dunesMaterial = new MeshMaterial()
    dunesMaterial.program = context.get(DeferredGeometryPass).programs[0]
    dunesMaterial.diffuse = SharedSystem.textures.sandstone
    dunesMaterial.normal = materials.addRenderTexture(
        materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize), 0,
        ShaderProgram(context.gl, shaders.fullscreen_vert, require('../shaders/dunes_frag.glsl')), {
            uScreenSize: [MaterialSystem.textureSize, MaterialSystem.textureSize]
        }, 0
    ).target

    const metalMaterial = new MeshMaterial()
    metalMaterial.program = context.get(DeferredGeometryPass).programs[0]
    metalMaterial.diffuse = SharedSystem.textures.wreck
    metalMaterial.normal = createTexture(context.gl, {
        width: 1, height: 1, data: new Uint8Array([0x7F,0x7F,0xFF,0xFF])
    })

    const orbMaterial = new MeshMaterial()
    orbMaterial.program = ShaderProgram(context.gl, shaders.geometry_vert, require('../shaders/orb_frag.glsl'), {})

    const corrosionMaterial = new DecalMaterial()
    corrosionMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, require('../shaders/corrode_frag.glsl'), {
        INSTANCED: true, ALPHA_CUTOFF: 0.01
    })
    corrosionMaterial.program.uniforms['uLayer'] = OpaqueLayer.Skinned


    const shieldMaterial = new ShaderMaterial()
    shieldMaterial.program = ShaderProgram(context.gl, shaders.geometry_vert, require('../shaders/shield_frag.glsl'), {})
    shieldMaterial.cullFace = GL.NONE
    shieldMaterial.blendMode = ShaderMaterial.Add

    const shieldDisplacementMaterial = new ShaderMaterial()
    shieldDisplacementMaterial.program = ShaderProgram(context.gl, shaders.geometry_vert, require('../shaders/shield_frag.glsl'), { DISPLACEMENT: true })

    



    const gradientMaterial = new SpriteMaterial()
    gradientMaterial.program = context.get(ParticleEffectPass).program
    gradientMaterial.diffuse = SharedSystem.gradients.simple

    const dissolveProgram = ShaderProgram(context.gl, shaders.geometry_vert, shaders.geometry_frag, {
        SKINNING: true, NORMAL_MAPPING: true, COLOR_INDEX: true, DISSOLVE: true
    })
    dissolveProgram.uniforms.uDissolveDirection = vec3(0,-1,0)
    dissolveProgram.uniforms.uDissolveThreshold = 0.36
    dissolveProgram.uniforms.uDissolveColor = vec4(1.0,0.2,0.4,0.8)
    dissolveProgram.uniforms.uDissolveUVScale = vec3(16,16, 0.8)


    const beamLinearProgram = ShaderProgram(context.gl, shaders.batch_vert, require('../shaders/beam_frag.glsl'))
    const beamRadialProgram = ShaderProgram(context.gl, shaders.batch_vert, require('../shaders/beam_frag.glsl'), { RADIAL: true })



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


    const stampMaterial = new DecalMaterial()
    stampMaterial.blendMode = null
    stampMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, shaders.decal_frag, {
        INSTANCED: true, ALPHA_CUTOFF: 0.01, NORMAL_MAPPING: true, MASK: true
    })
    stampMaterial.program.uniforms['uLayer'] = 1
    stampMaterial.program.uniforms['uDissolveEdge'] = 0.1
    stampMaterial.diffuse = SharedSystem.textures.stamp
    stampMaterial.normal = SharedSystem.textures.stampNormal

    const shatterMaterial = new DecalMaterial()
    shatterMaterial.program = context.get(DecalPass).program
    shatterMaterial.diffuse = SharedSystem.textures.shatter
    shatterMaterial.normal = SharedSystem.textures.shatterNormal

    const cracksMaterial = new DecalMaterial()
    cracksMaterial.program = context.get(DecalPass).program
    cracksMaterial.diffuse = SharedSystem.textures.cracks
    cracksMaterial.normal = SharedSystem.textures.cracksNormal

    return {
        ...EffectMaterials(context.gl),
        radialProgram: ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.radial),

        decal: {
            glow: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.glow),
            halo: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.halo),
            ring: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.ring),
            rays: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.rays),
            particle: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.particle),
        },
        sprite: {
            rays: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.rays),
            halo: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.halo),
            burst: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.burst),
            ring: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.ring),
            wave: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.wave),
            beam: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.raysBeam),
            sparkle: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.sparkle),
            spiral: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.spiral),
            dust: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.groundDust),
            swirl: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.swirl),

            yellowLine: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.gradients.yellowLine),
        },
        displacement: {
            ring: SpriteMaterial.create(distortion, SharedSystem.textures.ring, true),
            wave: SpriteMaterial.create(distortion, SharedSystem.textures.wave, true),
            bulge: SpriteMaterial.create(distortion, SharedSystem.textures.bulge, true),
        },
        distortion: {
            ring: SpriteMaterial.create(chromaticAberration, SharedSystem.textures.ring, true),
            wave: SpriteMaterial.create(chromaticAberration, SharedSystem.textures.wave, true),
            bulge: SpriteMaterial.create(chromaticAberration, SharedSystem.textures.bulge, true),
            particle: SpriteMaterial.create(chromaticAberration, SharedSystem.textures.particle, true),
        },



        stampMaterial, shatterMaterial, cracksMaterial,
        heatDistortion, dunesMaterial, metalMaterial, dissolveProgram, orbMaterial,

        gradientMaterial, beamLinearProgram, beamRadialProgram,

        glowSquaresLinearMaterial, glowSquaresRadialMaterial, reticleMaterial,

        shieldDisplacementMaterial, shieldMaterial, resourceSpotMaterial, corrosionMaterial,

        mossMaterial
    }
}