import { Application } from '../framework'
import { vec4 } from '../math'
import { GL, UniformSamplerBindings, ShaderProgram } from '../webgl'
import * as shaders from '../shaders'
import { DeferredGeometryPass, PostEffectPass } from '../pipeline'

import { SharedSystem } from '../../world/shared'
import { AmbientLightPass } from '../pipeline'
import { DomNode, IDebugHelper } from './DebugHelper'

export class TextureHelper implements IDebugHelper {
    public texture: WebGLTexture
    public cubemap: WebGLTexture
    private readonly textureProgram: ShaderProgram
    private readonly cubemapProgram: ShaderProgram
    constructor(private readonly context: Application){
        this.textureProgram = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.fullscreen_frag)
        this.textureProgram.uniforms['uMask'] = vec4.ONE
        this.cubemapProgram = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.fullscreen_frag, { CUBEMAP: true })
        this.cubemapProgram.uniforms['uMask'] = vec4.ONE
    }
    public update(): void {
        if(this.texture) this.renderDebugTexture(this.texture, GL.TEXTURE_2D)
        else if(this.cubemap) this.renderDebugTexture(this.cubemap, GL.TEXTURE_CUBE_MAP)
    }
    public open(): HTMLElement {
        const textures: Array<{
            texture: WebGLTexture
            type: number
            key: string
        }> = [{ texture: null, type: GL.NONE, key: 'none' }]
        for(let key in SharedSystem.textures) textures.push({
            key, texture: SharedSystem.textures[key], type: GL.TEXTURE_2D
        })
        const reflection = this.context.get(AmbientLightPass).reflection
        for(let i = 0; i < reflection.probes.length; i++) textures.push({
            key: `envmap_${i}`, texture: reflection.probes[i].cubemap, type:  GL.TEXTURE_CUBE_MAP
        })

        textures.unshift(
            { texture: this.context.get(DeferredGeometryPass).position, type: GL.TEXTURE_2D, key: 'position_buffer' },
            { texture: this.context.get(DeferredGeometryPass).normal, type: GL.TEXTURE_2D, key: 'normal_buffer' },
            { texture: this.context.get(DeferredGeometryPass).albedo, type: GL.TEXTURE_2D, key: 'albedo_buffer' },
            { texture: this.context.get(PostEffectPass).bloom.texture, type: GL.TEXTURE_2D, key: 'bloom_buffer' }
        )

        return DomNode('div', {
            style: { display: 'flex', flexDirection: 'column' }
        }, [
            DomNode('div', {
                innerText: 'texture', style: { textTransform: 'uppercase', display: 'flex', borderBottom: '1px solid #efefef' }
            }),
            DomNode('select', {
                style: { background: 'inherit', color: 'inherit', pointerEvents: 'all' }
            }, textures.map((texture, index) => DomNode('option', {
                value: index, innerText: texture.key, style: { background: 'inherit', color: 'inherit' }
            })), {
                input: event => {
                    const index = (event.target as HTMLOptionElement).value
                    this.texture = this.cubemap = null
                    const { texture, type } = textures[index]
                    if(type === GL.TEXTURE_CUBE_MAP) this.cubemap = texture
                    else this.texture = texture
                }
            })
        ])
    }
    renderDebugTexture(texture: WebGLTexture, type: number = GL.TEXTURE_2D){
        const gl = this.context.gl
        const plane = this.context.get(PostEffectPass).plane

        gl.bindFramebuffer(GL.FRAMEBUFFER, null)
        gl.bindVertexArray(plane.vao)
        switch(type){
            case GL.TEXTURE_2D:
                gl.useProgram(this.textureProgram.target)
                break
            case GL.TEXTURE_CUBE_MAP:
                gl.useProgram(this.cubemapProgram.target)
                break
        }

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(type, texture)

        gl.drawElements(GL.TRIANGLES, plane.indexCount, GL.UNSIGNED_SHORT, plane.indexOffset)
    }
}