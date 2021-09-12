import { Application } from '../../engine/framework'
import { ShaderProgram } from '../../engine/webgl'
import { shaders } from '../../engine/shaders'
import { MaterialSystem, MeshMaterial } from '../../engine/materials'
import { DeferredGeometryPass } from '../../engine/pipeline'

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

    return {
        distortion, chromaticAberration, dunesMaterial
    }
}