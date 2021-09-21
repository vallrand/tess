export class Monitor {
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