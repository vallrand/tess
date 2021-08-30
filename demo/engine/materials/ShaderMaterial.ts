import { GL, ShaderProgram, UniformSamplerBindings } from '../webgl'
import { IMaterial } from '../pipeline'

export class ShaderMaterial implements IMaterial {
    public static readonly Add = [[GL.FUNC_ADD],[GL.ONE,GL.ONE]]
    public static readonly Premultiply = [[GL.FUNC_ADD],[GL.ONE,GL.ONE_MINUS_SRC_ALPHA,GL.ZERO,GL.ONE]]
    depthWrite: boolean = false
    cullFace: GL.NONE | GL.BACK | GL.FRONT | GL.FRONT_AND_BACK = GL.BACK
    depthTest: GL.NONE | GL.LESS | GL.LEQUAL | GL.GREATER | GL.GEQUAL | GL.EQUAL = GL.LESS
    blendMode?: number[][] = null
    program: ShaderProgram = undefined
    public bind(gl: WebGL2RenderingContext): void {
        gl.depthMask(this.depthWrite)
        if(this.cullFace){
            gl.enable(GL.CULL_FACE)
            gl.cullFace(this.cullFace)
        }else gl.disable(GL.CULL_FACE)
        if(this.depthTest){
            gl.enable(GL.DEPTH_TEST)
            gl.depthFunc(this.depthTest)
        }else gl.disable(GL.DEPTH_TEST)
        if(this.blendMode){
            gl.enable(GL.BLEND)
            if(this.blendMode[0].length == 1) gl.blendEquation(this.blendMode[0][0])
            else gl.blendEquationSeparate(this.blendMode[0][0], this.blendMode[0][1])
            if(this.blendMode[1].length == 2) gl.blendFunc(this.blendMode[1][0], this.blendMode[1][1])
            else gl.blendFuncSeparate(this.blendMode[1][0], this.blendMode[1][1], this.blendMode[1][2], this.blendMode[1][3])
        }else gl.disable(GL.BLEND)
    }
    public merge(material: IMaterial): boolean {
        return this === material ||
        this.program === material.program &&
        this.depthWrite === (material as ShaderMaterial).depthWrite &&
        this.depthTest === (material as ShaderMaterial).depthTest &&
        this.cullFace === (material as ShaderMaterial).cullFace &&
        this.blendMode === (material as ShaderMaterial).blendMode
    }
}