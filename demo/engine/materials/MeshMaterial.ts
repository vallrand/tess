import { GL, ShaderProgram, UniformSamplerBindings } from '../webgl'
import { IMaterial } from '../pipeline'

export class MeshMaterial implements IMaterial {
    index: number
    diffuse: WebGLTexture
    normal?: WebGLTexture
    array?: WebGLTexture
    arrayLayers: number
    program: ShaderProgram
    public bind(gl: WebGL2RenderingContext): void {
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