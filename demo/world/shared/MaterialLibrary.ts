import { shaders } from '../../engine/shaders'
import { ShaderProgram } from '../../engine/webgl'
import { Application } from '../../engine/framework'
import { MaterialSystem } from '../../engine/materials/Material'

export function MaterialLibrary(context: Application){
    const materials = context.get(MaterialSystem)

    const distortion = ShaderProgram(context.gl, shaders.batch_vert, shaders.distortion_frag, {})

    const chromaticAberration = ShaderProgram(context.gl, shaders.batch_vert, shaders.distortion_frag, {
        CHROMATIC_ABERRATION: true
    })

    

    return {
        distortion, chromaticAberration
    }
}