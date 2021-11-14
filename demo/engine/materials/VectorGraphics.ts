import { GL, createTexture } from '../webgl'
import { BoxPacker } from './TextureAtlas'
import { SpriteMaterial } from './SpriteMaterial'

export interface IVectorGraphics {
    shadow?: {
        x?: number
        y?: number
        blur?: number
        color?: string
    }
    line?: {
        width?: number
        cap?: 'butt' | 'round' | 'square'
        join?: 'miter' | 'bevel' | 'round'
        miterLimit?: number
    }
    color: string | {
        gradient: 'linear'
        colors: string[]
        stops?: number[]
        x0?: number
        y0?: number
        x1?: number
        y1?: number
    } | {
        gradient: 'radial'
        colors: string[]
        stops?: number[]
        x0?: number
        y0?: number
        x1?: number
        y1?: number
        r0?: number
        r1?: number
    }
    path: string
}

export class VectorGraphicsTexture extends BoxPacker {
    private readonly canvas: HTMLCanvasElement = document.createElement('canvas')
    public readonly ctx: CanvasRenderingContext2D = this.canvas.getContext('2d', { alpha: true })
    public readonly texture: WebGLTexture
    constructor(private readonly gl: WebGL2RenderingContext, readonly width: number, readonly height: number){
        super(width, height, 4)
        this.canvas.width = width
        this.canvas.height = height
        this.ctx.imageSmoothingEnabled = false
        this.texture = createTexture(gl, { width, height }, {
            format: GL.RGBA8, wrap: GL.CLAMP_TO_EDGE, filter: GL.LINEAR, mipmaps: GL.NONE, type: GL.TEXTURE_2D, premultiply: true
        })
    }
    public render(width: number, height: number, graphics: IVectorGraphics[]): SpriteMaterial {
        const frame = this.insert(width, height)
        for(let i = 0; i < graphics.length; i++){
            this.ctx.save()
            this.ctx.setTransform(1,0,0,-1,frame[0], frame[1]+height)
            this.renderLayer(graphics[i])
            this.ctx.restore()
        }
        return SpriteMaterial.create(this.texture, frame, this.size)
    }
    public update(){
        this.gl.texSubImage2D(GL.TEXTURE_2D, 0, 0, 0, GL.RGBA, GL.UNSIGNED_BYTE, this.canvas)
    }
    private renderLayer({ color, path, line, shadow }: IVectorGraphics): void {
        if(shadow){
            this.ctx.shadowBlur = shadow.blur
            this.ctx.shadowOffsetX = shadow.x
            this.ctx.shadowOffsetY = shadow.y
            this.ctx.shadowColor = shadow.color
        }
        if(line){
            this.ctx.lineWidth = line.width
            this.ctx.lineCap = line.cap
            this.ctx.lineJoin = line.join
            this.ctx.miterLimit = line.miterLimit
        }

        if(typeof color === 'string'){
            this.ctx.fillStyle = this.ctx.strokeStyle = color
        }else{
            const gradient = color.gradient === 'linear'
            ? this.ctx.createLinearGradient(color.x0, color.y0, color.x1, color.y1)
            : this.ctx.createRadialGradient(color.x0, color.y0, color.r0, color.x1, color.y1, color.r1)
            const stops = color.stops || color.colors.map((color, i, colors) => i / (colors.length - 1))
            for(let i = 0; i < color.colors.length; i++)
                gradient.addColorStop(stops[i], color.colors[i])
            this.ctx.fillStyle = this.ctx.strokeStyle = gradient
        }

        if(line) this.ctx.stroke(new Path2D(path))
        else this.ctx.fill(new Path2D(path))      
    }
}