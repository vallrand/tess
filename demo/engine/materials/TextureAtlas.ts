import { aabb2, vec2, vec4 } from '../math'
import { GL, ShaderProgram } from '../webgl'
import { MeshBuffer } from '../components/Mesh'
import { RenderTexture } from './Material'

export class BoxPacker {
    public readonly size: vec2 = vec2()
    private readonly empty: aabb2[] = []
    constructor(width: number, height: number, readonly padding: number = 0){
        vec2.set(width, height, this.size)
        this.empty.push(aabb2(0, 0, width, height))
    }
    public insert(width: number, height: number): aabb2 | null {
        width += this.padding
        height += this.padding
        for(let i = this.empty.length - 1; i >= 0; i--){
            const bounds = this.empty[i]
            const remainingWidth = bounds[2] - bounds[0] - width
            const remainingHeight = bounds[3] - bounds[1] - height
            if(remainingWidth < 0 || remainingHeight < 0) continue
            if(remainingHeight != 0) this.empty.push(aabb2(bounds[0], bounds[1] + height, bounds[2], bounds[3]))
            if(remainingWidth != 0) this.empty.push(aabb2(bounds[0] + width, bounds[1], bounds[2], bounds[1] + height))

            if(i == this.empty.length - 1) this.empty.length--
            else this.empty[i] = this.empty.pop()
            
            return aabb2.set(bounds[0], bounds[1], bounds[0] + width - this.padding, bounds[1] + height - this.padding, bounds)
        }
    }
}

export class TextureAtlas extends BoxPacker {
    constructor(private readonly gl: WebGL2RenderingContext, readonly texture: RenderTexture, private plane: MeshBuffer){
        super(texture.width, texture.height)
    }
    public render(bounds: aabb2, program: ShaderProgram, uniforms: Record<string, number | number[]>, clear?: vec4){
        const { gl } = this

        gl.bindFramebuffer(GL.FRAMEBUFFER, this.texture.fbo[0])
        gl.viewport(bounds[0], bounds[1], bounds[2] - bounds[0], bounds[3] - bounds[1])
        if(clear){
            gl.enable(GL.SCISSOR_TEST)
            gl.scissor(bounds[0], bounds[1], bounds[2] - bounds[0], bounds[3] - bounds[1])
            gl.clearColor(clear[0], clear[1], clear[2], clear[3])
            gl.clear(GL.COLOR_BUFFER_BIT)
            gl.disable(GL.SCISSOR_TEST)
        }
        gl.disable(GL.BLEND)
        gl.useProgram(program.target)
        for(let key in uniforms) program.uniforms[key] = uniforms[key]

        gl.bindVertexArray(this.plane.vao)
        gl.drawElements(this.plane.drawMode, this.plane.indexCount, GL.UNSIGNED_SHORT, this.plane.indexOffset)
    }
    
}