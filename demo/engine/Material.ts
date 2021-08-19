import { vec3, quat, mat4 } from './math'
import { GL, createTexture, compileProgram, locateUniforms, TextureOptions, ShaderProgram } from './webgl'
import { Application, IProgressHandler, System, Factory, Signal } from './framework'
import { PostEffectPass } from './deferred/PostEffectPass'

export class Material {
    index: number
    diffuse: WebGLTexture
    normal?: WebGLTexture
    array?: WebGLTexture
    arrayLayers: number
}

export interface RenderTexture {
    width: number
    height: number
    layers: number
    mipmaps: boolean
    target: WebGLTexture
    type: number
    fbo: WebGLFramebuffer[]
}

export class MaterialSystem implements System {
    public static pack2x4 = (x: number, y: number): number => (Math.floor(x*0xF) + Math.floor(y*0xF)*0x10) / 0xFF
    public static unpack2x4 = (xy: number): [number, number] => [(xy*(0xFF/0xF))%1, (xy*(0xFF/0xF0))%1]

    public static readonly textureSize: number = 256
    public static readonly heightmapScale: number = 10
    public readonly white: Material = new Material()
    public readonly materials: Material[] = Object.create(null)
    public readonly materialLoad = new Signal<Material>()
    public enabled: boolean = true
    private readonly renderQueue: {
        rate: number
        texture: RenderTexture
        layer: number
        program: ShaderProgram,
        uniforms: Record<string, any>
    }[] = []
    constructor(private readonly context: Application){
        this.white.diffuse = createTexture(this.context.gl, {
            width: 1, height: 1, data: new Uint8Array([0x7F,0x7F,0x7F,0x00])
        })
        this.white.normal = createTexture(this.context.gl, {
            width: 1, height: 1, data: new Uint8Array([0x7F,0x7F,0xFF,0x00])
        })
    }
    create(): Material {
        const material = new Material()
        return material
    }
    public fullscreenShader(shader: string): ShaderProgram {
        return ShaderProgram(this.context.gl, require('./deferred/fullscreen_vert.glsl'), shader)
    }
    public createRenderTexture(width: number, height: number, layers: number = 1, options?: TextureOptions): RenderTexture {
        const gl: WebGL2RenderingContext = this.context.gl
        const type = layers > 1 ? GL.TEXTURE_2D_ARRAY : GL.TEXTURE_2D
        const mipmaps = layers > 1 ? false : true
        const target = createTexture(gl, {
            width, height, depth: layers
        }, {
            flipY: false, mipmaps: mipmaps ? GL.NONE : GL.NEAREST,
            type: type, filter: GL.LINEAR, wrap: GL.REPEAT, ...options
        })
        const fbo: WebGLFramebuffer[] = Array(layers)
        if(layers === 1){
            fbo[0] = gl.createFramebuffer()
            gl.bindFramebuffer(GL.FRAMEBUFFER, fbo[0])
            gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, target, 0)
        }else for(let index = 0; index < layers; index++){
            fbo[index] = gl.createFramebuffer()
            gl.bindFramebuffer(GL.FRAMEBUFFER, fbo[index])
            gl.framebufferTextureLayer(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0 + 0, target, 0, index)
        }
        return { width, height, layers, target, mipmaps, type, fbo }
    }
    public renderTexture(texture: RenderTexture, layer: number, program: ShaderProgram, uniforms: Record<string, any>){
        const gl: WebGL2RenderingContext = this.context.gl

        gl.bindFramebuffer(GL.FRAMEBUFFER, texture.fbo[layer])
        gl.disable(GL.BLEND)
        gl.viewport(0, 0, texture.width, texture.height)
        gl.useProgram(program.target)
        program.uniforms['uTime'] = this.context.currentTime

        let textureIndex = 1
        for(let key in uniforms)
            if(uniforms[key] instanceof WebGLTexture){
                gl.activeTexture(GL.TEXTURE0 + textureIndex)
                gl.bindTexture(GL.TEXTURE_2D, uniforms[key])
                program.uniforms[key] = textureIndex++
            }else
                program.uniforms[key] = uniforms[key]

        const plane = this.context.get(PostEffectPass).plane
        gl.bindVertexArray(plane.vao)
        gl.drawElements(GL.TRIANGLES, plane.indexCount, GL.UNSIGNED_SHORT, plane.indexOffset)

        if(texture.mipmaps){
            gl.activeTexture(GL.TEXTURE0)
            gl.bindTexture(texture.type, texture.target)
            gl.generateMipmap(GL.TEXTURE_2D)
        }
    }
    public addRenderTexture(
        texture: RenderTexture, layer: number, program: ShaderProgram,
        uniforms: Record<string, any>, rate: number
    ): RenderTexture {
        const gl: WebGL2RenderingContext = this.context.gl
        uniforms['uScreenSize'] = [texture.width, texture.height]
        if(rate < 1){
            this.renderTexture(texture, layer, program, uniforms)
            gl.deleteFramebuffer(texture.fbo[layer])
            gl.deleteProgram(program.target)
            texture.fbo[layer] = null
            program.target = null
        }else this.renderQueue.push({ rate, texture, layer, program, uniforms })
        return texture
    }
    public update(): void {
        if(!this.enabled) return
        const gl: WebGL2RenderingContext = this.context.gl
        for(let i = this.renderQueue.length - 1; i >= 0; i--){
            const { rate, texture, layer, program, uniforms } = this.renderQueue[i]
            if(this.context.frame % rate != 0) continue
            this.renderTexture(texture, layer, program, uniforms)
        }
    }
    public load(manifest: { texture: string[], model: {texture:number}[] }, progress: IProgressHandler<void>): void {
        let remaining = manifest.texture.length
        progress(remaining)

        function renderNormalMap(material: Material, width: number, height: number){
            if(!manifest.model.find(model => model.texture === material.index)) return
            const normalTexture = this.addRenderTexture(
                this.createRenderTexture(width, height, 1), 0,
                this.fullscreenShader(require('./shaders/normal_height.glsl')), {
                uSampler: material.diffuse, uScale: MaterialSystem.heightmapScale,
                uScreenSize: [width, height]
            }, 0).target
            material.normal = normalTexture
        }

        for(let i = remaining - 1; i >= 0; i--){
            const material = this.materials[i] = new Material()
            material.index = i
            const image: HTMLImageElement = new Image()
            image.crossOrigin = 'anonymous'
            image.onerror = event => progress(-1, new Error(`${manifest.texture[i]}`))
            image.onload = event => {
                const { naturalWidth: width, naturalHeight: height } = image
                const texture = createTexture(this.context.gl, { width, height, data: image })
                material.diffuse = texture
                renderNormalMap.call(this, material, width, height)
                this.materialLoad.dispatch(material)
                progress(--remaining)
            }
            image.src = manifest.texture[i]
        }
    }
}