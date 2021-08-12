import { range, mat3x2, vec4, mat3 } from '../math'
import { Application, System } from '../framework'
import { GL, ShaderProgram, UniformSamplerBindings } from '../webgl'
import { PostEffectPass } from './PostEffectPass'
import { RenderTexture } from '../Material'
import { Batch2D } from '../batch'
import { ParticleSystem } from '../particles'

export interface IEffect {
    enabled: boolean
    apply(): void
}

export class ParticleEffectPass implements System {
    public readonly effects: IEffect[] = []
    public readonly particleSystems: ParticleSystem[] = []
    constructor(private readonly context: Application){
        const gl: WebGL2RenderingContext = context.gl
        
    }
    public update(): void {
        const { gl } = this.context

        gl.cullFace(GL.BACK)
        gl.disable(GL.CULL_FACE)
        gl.depthFunc(GL.LEQUAL)
        gl.enable(GL.DEPTH_TEST)
        //this.context.get(PostEffectPass).swapRenderTarget()

        for(let i = this.particleSystems.length - 1; i >= 0; i--) this.particleSystems[i].render()
        for(let i = this.effects.length - 1; i >= 0; i--) this.effects[i].apply()
    }
}