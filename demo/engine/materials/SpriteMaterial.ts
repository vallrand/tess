import { vec4 } from '../math'
import { GL, ShaderProgram } from '../webgl'
import { IMaterial } from '../pipeline'
import { ShaderMaterial } from './ShaderMaterial'

export class SpriteMaterial extends ShaderMaterial implements IMaterial {
    public static create(program: ShaderProgram, diffuse: WebGLTexture, post?: boolean): SpriteMaterial {
        const material = new SpriteMaterial()
        material.program = program
        material.diffuse = diffuse
        if(post){
            material.blendMode = null
            material.cullFace = GL.NONE
        }
        return material
    }
    constructor(readonly uvTransform: vec4 = vec4(0,0,1,1)){super()}
    diffuse: WebGLTexture
    normal?: WebGLTexture
    depthTest: number = GL.LEQUAL
    blendMode = ShaderMaterial.Premultiply
    bind(gl: WebGL2RenderingContext): void {
        super.bind(gl)
        if('uUVTransform' in this.program.uniforms) this.program.uniforms['uUVTransform'] = this.uvTransform
    }
    merge(material: IMaterial): boolean {
        return super.merge(material) && (
            'uSamplers' in this.program.uniforms ||
            this.diffuse === (material as SpriteMaterial).diffuse
        )
    }
}