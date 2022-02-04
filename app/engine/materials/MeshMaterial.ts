import { GL, UniformSamplerBindings } from '../webgl'
import { IMaterial } from '../pipeline'
import { ShaderMaterial } from './ShaderMaterial'

export class MeshMaterial extends ShaderMaterial implements IMaterial {
    static copy(source: MeshMaterial, out: MeshMaterial){
        out.diffuse = source.diffuse
        out.normal = source.normal
        out.array = source.array
        out.arrayLayers = source.arrayLayers
    }
    index: number
    diffuse: WebGLTexture
    normal?: WebGLTexture
    array?: WebGLTexture
    arrayLayers: number

    depthTest = GL.LEQUAL
    cullFace = GL.BACK
    blendMode = null
    depthWrite = true

    public bind(gl: WebGL2RenderingContext): void {
        super.bind(gl)
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uDiffuseMap)
        gl.bindTexture(GL.TEXTURE_2D, this.diffuse)
        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uNormalMap)
        gl.bindTexture(GL.TEXTURE_2D, this.normal)
        if(this.array){
            gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uArrayMap)
            gl.bindTexture(GL.TEXTURE_2D_ARRAY, this.array)
            this.program.uniforms['uArrayMapLayers'] = this.arrayLayers - 1
        }
    }
    public merge(material: IMaterial): boolean { return material === this }
}