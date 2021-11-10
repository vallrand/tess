import { Application } from '../../engine/framework'
import { vec2, vec3, vec4 } from '../../engine/math'
import { ShaderProgram, GL, OpaqueLayer } from '../../engine/webgl'
import * as shaders from '../../engine/shaders'
import * as localShaders from '../shaders'
import { MaterialSystem, ShaderMaterial, MeshMaterial, EffectMaterial, SpriteMaterial, DecalMaterial } from '../../engine/materials'
import { DeferredGeometryPass, ParticleEffectPass, DecalPass } from '../../engine/pipeline'
import { SharedSystem } from '../shared'

function EffectMaterials(gl: WebGL2RenderingContext){
    const coneTeal = new EffectMaterial(gl, {
        VERTICAL_MASK: true, PANNING: true, GREYSCALE: true, GRADIENT: true
    }, {
        uUVTransform: vec4(0,0,2,0.2),
        uVerticalMask: vec4(0,0.5,0,0),
        uUVPanning: vec2(-0.2, -0.4),
        uUV2Transform: vec4(0,0,1,0.5),
        uUV2Panning: vec2(0.3, -0.7),
        uColorAdjustment: vec3(1,0.8,0)
    })
    coneTeal.diffuse = SharedSystem.textures.cellularNoise
    coneTeal.gradient = SharedSystem.gradients.teal

    const absorbTeal = new EffectMaterial(gl, {
        PANNING: true, VERTICAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uVerticalMask: vec4(0,0.9,0.9,1),
        uUVTransform: vec4(0,0,1,1),
        uUVPanning: vec2(0,-0.32),
        uUV2Transform: vec4(0,0,1,1),
        uUV2Panning: vec2(0,-0.64),
        uColorAdjustment: vec3(1.4,0.9,0)
    })
    absorbTeal.diffuse = SharedSystem.textures.noiseDirectional
    absorbTeal.gradient = SharedSystem.gradients.darkTeal

    const stripes = new EffectMaterial(gl, {
        FRESNEL: true, PANNING: true, VERTICAL_MASK: true
    }, {
        uUVTransform: vec4(0,0,1,1),
        uUVPanning: vec2(0, -0.6),
        uVerticalMask: vec4(0,0,0.8,1),
        uFresnelMask: vec2(0.1,0.5)
    })
    stripes.diffuse = SharedSystem.textures.stripes

    const auraTeal = new EffectMaterial(gl, {
        VERTICAL_MASK: true, PANNING: true, GREYSCALE: true, GRADIENT: true, POLAR: true, DEPTH_OFFSET: 5.2
    }, {
        uUVTransform: vec4(0,0,1,0.8),
        uVerticalMask: vec4(0.2,0.4,0.6,1),
        uUVPanning: vec2(0.2, -0.1),
        uUV2Transform: vec4(0,0,1,1.6),
        uUV2Panning: vec2(-0.2, -0.3),
        uColorAdjustment: vec3(1,0.9,0)
    })
    auraTeal.diffuse = SharedSystem.textures.cellularNoise
    auraTeal.gradient = SharedSystem.gradients.teal

    const energyHalfPurple = new EffectMaterial(gl, {
        VERTICAL_MASK: true, PANNING: true, HALF: true, GREYSCALE: true, GRADIENT: true
    }, {
        uUVTransform: vec4(0,0,1,0.3),
        uUVPanning: vec2(0.2, -0.2),
        uVerticalMask: vec4(0.0,0.4,0.6,1.0),
        uColorAdjustment: vec3(3,1,0),
        uUV2Transform: vec4(0,0,1,0.6),
        uUV2Panning: vec2(-0.2, -0.3)
    })
    energyHalfPurple.diffuse = SharedSystem.textures.voronoiNoise
    energyHalfPurple.gradient = SharedSystem.gradients.purple

    const flashYellow = new EffectMaterial(gl, {
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
    flashYellow.diffuse = SharedSystem.textures.cellularNoise
    flashYellow.gradient = SharedSystem.gradients.yellowViolet

    const coreYellow = new EffectMaterial(gl, {
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
    coreYellow.diffuse = SharedSystem.textures.cellularNoise
    coreYellow.gradient = SharedSystem.gradients.yellowRed2D

    const coreWhite = new EffectMaterial(gl, {
        FRESNEL: true, PANNING: true, GRADIENT: true, GREYSCALE: true
    }, {
        uUVTransform: vec4(0,0,2,1.7),
        uUVPanning: vec2(-0.1,0.9),
        uFresnelMask: vec2(0.2,0.6),
        uColorAdjustment: vec3(1,0.9,0),
        uUV2Transform: vec4(0,0.7,3,2.9),
        uUV2Panning: vec2(0.1,0.7),
    })
    coreWhite.diffuse = SharedSystem.textures.sineNoise
    coreWhite.gradient = SharedSystem.gradients.brightRed

    const ringDust = new EffectMaterial(gl, {
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
    ringDust.diffuse = SharedSystem.textures.cellularNoise
    ringDust.gradient = SharedSystem.gradients.orange2D

    const stripesRed = new EffectMaterial(gl, {
        PANNING: true, GREYSCALE: true, GRADIENT: true, VERTICAL_MASK: true
    }, {
        uUVTransform: vec4(0,0,3,2),
        uUVPanning: vec2(-0.4,-0.8),
        uColorAdjustment: vec3(1,1,0),
        uUV2Transform: vec4(0,0.04,2,2),
        uUV2Panning: vec2(0.4,-0.8),
        uVerticalMask: vec4(0.0,0.5,0.8,1.0),
    })
    stripesRed.diffuse = SharedSystem.textures.blocklines
    stripesRed.gradient = SharedSystem.gradients.darkRed

    const stripesBlocky = new EffectMaterial(gl, {
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
    stripesBlocky.diffuse = SharedSystem.textures.blocklines
    stripesBlocky.gradient = SharedSystem.gradients.white
    stripesBlocky.displacement = SharedSystem.textures.blocklines

    const trailSmoke = new EffectMaterial(gl, {
        PANNING: true, HORIZONTAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uHorizontalMask: vec4(0,0.4,0.6,1.0),
        uUVTransform: vec4(0,0,0.4,1.7),
        uUVPanning: vec2(-0.1,0.7+0.4),
        uUV2Transform: vec4(0,0,0.7,1.5),
        uUV2Panning: vec2(0.1,0.5+0.4),
        uColorAdjustment: vec3(1,0.8,0.2)
    })
    trailSmoke.gradient = SharedSystem.gradients.purpleGrey2D
    trailSmoke.diffuse = SharedSystem.textures.cloudNoise

    const trailEnergy = new EffectMaterial(gl, {
        PANNING: true, HORIZONTAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uHorizontalMask: vec4(0,0.5,0.5,1.0),
        uUVTransform: vec4(0,0,0.4,1),
        uUVPanning: vec2(0.04,-0.6),
        uUV2Transform: vec4(0,0,0.25,0.8),
        uUV2Panning: vec2(-0.08,-0.4),
        uColorAdjustment: vec3(1,1.2,0.1)
    })
    trailEnergy.diffuse = SharedSystem.textures.sineNoise
    trailEnergy.gradient = SharedSystem.gradients.purple

    const energyPurple = new EffectMaterial(gl, {
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
    energyPurple.diffuse = SharedSystem.textures.sineNoise
    energyPurple.gradient = SharedSystem.gradients.purple
    energyPurple.displacement = SharedSystem.textures.perlinNoise

    const planeDissolve = new EffectMaterial(gl, {
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
    planeDissolve.diffuse = SharedSystem.textures.sineNoise
    planeDissolve.gradient = SharedSystem.gradients.white
    planeDissolve.displacement = SharedSystem.textures.perlinNoise

    const exhaust = new EffectMaterial(gl, {
        PANNING: true, VERTICAL_MASK: true, GREYSCALE: true, GRADIENT: true
    }, {
        uVerticalMask: vec4(0,0.4,0.6,0.8),
        uUVTransform: vec4(-0.1,0,1,0.5),
        uUVPanning: vec2(-0.1,1.4),
        uUV2Transform: vec4(0,0,1,0.7),
        uUV2Panning: vec2(0.2, 1.8),
        uColorAdjustment: vec3(2.0,2.0,0.2)
    })
    exhaust.diffuse = SharedSystem.textures.cellularNoise
    exhaust.gradient = SharedSystem.gradients.brightPurple
    exhaust.cullFace = GL.NONE

    return {
        coneTeal, absorbTeal, auraTeal, energyPurple, energyHalfPurple,
        flashYellow, coreYellow, coreWhite, ringDust, planeDissolve, exhaust,
        stripes, stripesRed, stripesBlocky, trailSmoke, trailEnergy,
    }
}

export function MaterialLibrary(context: Application){
    const resourceSpotMaterial = new DecalMaterial()
    resourceSpotMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, localShaders.spot, { INSTANCED: true, ALPHA_CUTOFF: 0.01 })
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
    dunesMaterial.normal = SharedSystem.textures.dunesNormal

    const metalMaterial = new MeshMaterial()
    metalMaterial.program = context.get(DeferredGeometryPass).programs[0]
    metalMaterial.diffuse = SharedSystem.textures.wreck
    metalMaterial.normal = SharedSystem.textures.flatNormal

    const orbMaterial = new MeshMaterial()
    orbMaterial.program = ShaderProgram(context.gl, shaders.geometry_vert, localShaders.orb, {})

    const corrosionMaterial = new DecalMaterial()
    corrosionMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, localShaders.acid, {
        INSTANCED: true, ALPHA_CUTOFF: 0.01
    })
    corrosionMaterial.program.uniforms['uLayer'] = OpaqueLayer.Skinned


    const shieldMaterial = new ShaderMaterial()
    shieldMaterial.program = ShaderProgram(context.gl, shaders.geometry_vert, localShaders.shield, {})
    shieldMaterial.cullFace = GL.NONE
    shieldMaterial.blendMode = ShaderMaterial.Add

    const shieldDisplacementMaterial = new ShaderMaterial()
    shieldDisplacementMaterial.program = ShaderProgram(context.gl, shaders.geometry_vert, localShaders.shield, { DISPLACEMENT: true })

    

    const pulseMaterial = new ShaderMaterial()
    pulseMaterial.cullFace = 0
    pulseMaterial.depthTest = 0
    pulseMaterial.depthWrite = false
    pulseMaterial.blendMode = ShaderMaterial.Premultiply
    pulseMaterial.program = ShaderProgram(context.gl, shaders.geometry_vert, localShaders.pulse, {})

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


    const beamLinearProgram = ShaderProgram(context.gl, shaders.batch_vert, localShaders.beam)
    const beamRadialProgram = ShaderProgram(context.gl, shaders.batch_vert, localShaders.beam, { RADIAL: true })



    const glowSquaresLinearMaterial = new DecalMaterial()
    glowSquaresLinearMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, localShaders.battery, { INSTANCED: true })
    glowSquaresLinearMaterial.program.uniforms['uLayer'] = glowSquaresLinearMaterial.layer
    glowSquaresLinearMaterial.program.uniforms['uDissolveEdge'] = 1

    const glowSquaresRadialMaterial = new DecalMaterial()
    glowSquaresRadialMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, localShaders.battery, { INSTANCED: true, POLAR: true })
    glowSquaresRadialMaterial.program.uniforms['uLayer'] = glowSquaresRadialMaterial.layer
    glowSquaresRadialMaterial.program.uniforms['uDissolveEdge'] = 1

    const reticleMaterial = new DecalMaterial()
    reticleMaterial.program = ShaderProgram(context.gl, shaders.decal_vert, localShaders.mark, { INSTANCED: true })
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

    const beamRadialYellowMaterial = new SpriteMaterial(vec4(8, 10, 1, 1))
    beamRadialYellowMaterial.program = beamRadialProgram
    beamRadialYellowMaterial.diffuse = SharedSystem.gradients.yellowViolet

    const beamLinearRedMaterial = new SpriteMaterial(vec4(4, 8, 1, 1))
    beamLinearRedMaterial.program = beamLinearProgram
    beamLinearRedMaterial.diffuse = SharedSystem.gradients.redPurple

    const beamRadialRedMaterial = new SpriteMaterial(vec4(8, -16, 1, 1))
    beamRadialRedMaterial.program = beamRadialProgram
    beamRadialRedMaterial.diffuse = SharedSystem.gradients.redPurple

    return {
        effect: EffectMaterials(context.gl),
        radialProgram: ShaderProgram(context.gl, shaders.fullscreen_vert, localShaders.radial),

        decal: {
            glow: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.glow),
            halo: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.halo),
            ring: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.ring),
            rays: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.rays),
            particle: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.particle),
            dust: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.dust),
            reticle: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.reticle),
            moss: DecalMaterial.create(context.get(DecalPass).program, SharedSystem.textures.moss),
        },
        sprite: {
            glow: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.glow),
            rays: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.rays),
            halo: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.halo),
            burst: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.burst),
            ring: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.ring),
            wave: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.wave),
            beam: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.beam),
            sparkle: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.sparkle),
            spiral: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.spiral),
            dust: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.dust),
            swirl: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.swirl),
            streak: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.streak),
            particle: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.textures.particle),

            lineYellow: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.gradients.yellowLine),
            lineTeal: SpriteMaterial.create(context.get(ParticleEffectPass).program, SharedSystem.gradients.tealLine),
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
        heat: SpriteMaterial.create(heatDistortion, SharedSystem.textures.perlinNoise, true),
        mesh: {
            orb: orbMaterial,
            dunes: dunesMaterial,
            metal: metalMaterial
        },
        program: {
            dissolve: dissolveProgram,
            beamLinear: beamLinearProgram,
            beamRadial: beamRadialProgram
        },
        beamRadialYellowMaterial, beamLinearRedMaterial, beamRadialRedMaterial,
        pulseMaterial,
        stampMaterial, shatterMaterial, cracksMaterial,
        gradientMaterial,
        glowSquaresLinearMaterial, glowSquaresRadialMaterial, reticleMaterial,
        shieldDisplacementMaterial, shieldMaterial, resourceSpotMaterial, corrosionMaterial,
    }
}