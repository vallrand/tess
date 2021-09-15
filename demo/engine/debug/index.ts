import { vec4 } from '../math'
import { Application, ISystem } from '../framework'
import { GL, UniformSamplerBindings, ShaderProgram } from '../webgl'
import { shaders } from '../shaders'
import { PostEffectPass } from '../pipeline/PostEffectPass'

class Monitor {
    public readonly dom: HTMLDivElement = document.createElement('div')
    private readonly label: HTMLDivElement = document.createElement('div')
    private readonly canvas: HTMLCanvasElement = document.createElement('canvas')
    private readonly ctx: CanvasRenderingContext2D
    private prevTimestamp: number = 0
    private timeElapsed: number = 0
    private readonly values: number[] = []
    constructor(private options: {
        color: string
        refreshRate: number
        range: [number, number]
        label: string
        update: (dt: number) => void
    }){
        Object.assign(this.dom.style, { display: 'inline-block', padding: '0.2em', backgroundColor: 'rgba(0,0,0,1)', color: options.color })
        this.dom.appendChild(this.label)
        Object.assign(this.canvas.style, { boxSizing: 'border-box', border: `1px solid ${options.color}` })
        this.dom.appendChild(this.canvas)
        Object.assign(this.canvas, { width: 72, height: 36 })
        this.ctx = this.canvas.getContext('2d', { alpha: false })
        this.ctx.imageSmoothingEnabled = false
        this.update(0)
    }
    private render(){
        const { ctx, canvas, values, options: { range, color } } = this
        ctx.globalCompositeOperation = 'copy'
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 1, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'source-over'
        const average = values.reduce((total, value) => total + value, 0) / values.length
        values.length = 0
        const normalized = (average - range[0]) / (range[1] - range[0])
        const height = normalized * canvas.height | 0
        ctx.fillStyle = color
        ctx.fillRect(0, canvas.height - height, 1, height)

        this.label.innerText = `${this.options.label}: ${average.toFixed(2)}`
    }
    update = timestamp => {
        const deltaTime = timestamp - this.prevTimestamp
        this.prevTimestamp = timestamp
        this.timeElapsed += deltaTime

        if(this.options.update) this.options.update.call(this, deltaTime)
        if(this.timeElapsed >= this.options.refreshRate){
            this.timeElapsed = 0
            this.render()
        }

        requestAnimationFrame(this.update)
    }
}

export class DebugSystem implements ISystem {
    public texture: WebGLTexture
    public cubemap: WebGLTexture
    private readonly textureProgram: ShaderProgram
    private readonly cubemapProgram: ShaderProgram
    constructor(private readonly context: Application){
        window['app'] = context
        this.textureProgram = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.fullscreen_frag)
        this.textureProgram.uniforms['uMask'] = vec4.ONE
        this.cubemapProgram = ShaderProgram(this.context.gl, shaders.fullscreen_vert, shaders.fullscreen_frag, { CUBEMAP: true })
        this.cubemapProgram.uniforms['uMask'] = vec4.ONE
        this.attachDebugPanel()
    }
    update(){
        if(this.texture) this.renderDebugTexture(this.texture, GL.TEXTURE_2D)
        if(this.cubemap) this.renderDebugTexture(this.cubemap, GL.TEXTURE_CUBE_MAP)
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
    private attachDebugPanel(){
        const panel = document.createElement('div')
        Object.assign(panel.style, { position: 'fixed', top: 0, left: 0, zIndex: 128, fontSize: '0.8em' })
    
        const FPS = new Monitor({
            refreshRate: 100,
            color: '#83e82a', label: 'FPS', range: [0, 60],
            update(deltaTime){
                this.values.push(1000 / deltaTime)
            }
        })
    
        const glCalls = {
            drawElements: 0,
            drawArrays: 0,
            drawArraysInstanced: 0,
            drawElementsInstanced: 0,
            blitFramebuffer: 0
        }
        for(let property in glCalls)
            this.context.gl[property] = (base => function(){
                glCalls[property]++
                return base.apply(this, arguments)
            })(this.context.gl[property])
    
        const DC = new Monitor({
            refreshRate: 100,
            color: '#e8632a', label: 'DC', range: [0, 40],
            update(deltaTime){
                this.values.push(glCalls.drawArrays + glCalls.drawElements + glCalls.drawArraysInstanced + glCalls.drawElementsInstanced + glCalls.blitFramebuffer)
                glCalls.drawArrays = glCalls.drawElements = glCalls.drawArraysInstanced = glCalls.drawElementsInstanced = glCalls.blitFramebuffer = 0
            }
        })
    
        panel.appendChild(FPS.dom)
        panel.appendChild(DC.dom)
    
        document.body.appendChild(panel)
    }
}