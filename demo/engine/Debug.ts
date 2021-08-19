import { vec4 } from './math'
import { Application, System } from './framework'
import { GL, UniformSamplerBindings } from './webgl'
import { PostEffectPass } from './deferred/PostEffectPass'

class Monitor {
    public readonly dom: HTMLDivElement = document.createElement('div')
    private readonly label: HTMLDivElement = document.createElement('div')
    private readonly canvas: HTMLCanvasElement = document.createElement('canvas')
    private readonly ctx: CanvasRenderingContext2D
    private readonly refreshRate: number
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

        this.refreshRate = options.refreshRate || 1000
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

export function attachDebugPanel(){
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
    }
    HTMLCanvasElement.prototype.getContext = (getContext => function(){
        const gl = getContext.apply(this, arguments)
        const ContextClass = Object.getPrototypeOf(gl).constructor
        const GLProxy = Object.create(ContextClass.prototype)

        for(let property in glCalls)
            if(property in ContextClass.prototype)
                GLProxy[property] = (value => function(){
                    glCalls[property]++
                    return value.apply(this, arguments)
                })(ContextClass.prototype[property])
            else return gl
        return Object.setPrototypeOf(gl, GLProxy)
    })(HTMLCanvasElement.prototype.getContext)

    const DC = new Monitor({
        refreshRate: 100,
        color: '#e8632a', label: 'DC', range: [0, 40],
        update(deltaTime){
            this.values.push(glCalls.drawArrays + glCalls.drawElements + glCalls.drawArraysInstanced + glCalls.drawElementsInstanced)
            glCalls.drawArrays = glCalls.drawElements = glCalls.drawArraysInstanced = glCalls.drawElementsInstanced = 0
        }
    })

    panel.appendChild(FPS.dom)
    panel.appendChild(DC.dom)

    if(document.body) document.body.appendChild(panel)
    else document.addEventListener('DOMContentLoaded', function onload(){
        document.body.appendChild(panel)
    })
}

attachDebugPanel()

export class DebugSystem implements System {
    public texture: WebGLTexture
    constructor(private readonly context: Application){
        window['app'] = context
    }
    update(){
        if(this.texture) this.renderDebugTexture(this.texture)
    }
    renderDebugTexture(texture: WebGLTexture){
        const gl = this.context.gl
        const plane = this.context.get(PostEffectPass).plane
        const program = this.context.get(PostEffectPass).blit

        gl.bindFramebuffer(GL.FRAMEBUFFER, null)
        gl.bindVertexArray(plane.vao)
        gl.useProgram(program.target)
        program.uniforms['uMask'] = vec4.ONE

        gl.activeTexture(GL.TEXTURE0 + UniformSamplerBindings.uSampler)
        gl.bindTexture(GL.TEXTURE_2D, texture)

        gl.drawElements(GL.TRIANGLES, plane.indexCount, GL.UNSIGNED_SHORT, plane.indexOffset)
    }
}