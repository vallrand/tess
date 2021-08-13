import { ready, IProgressHandler, ProgressHandler } from './Loader'

export interface System {
    update(): void
    load?(manifest: any, progress: IProgressHandler<void>): void
}
export interface SystemType<T extends System> {
    index?: number
    new (context: Application): T
}

export class Application {
    private static readonly timestep = 2 * 1000/60
    private readonly canvas: HTMLCanvasElement = document.createElement('canvas')
    public readonly gl: WebGL2RenderingContext
    private readonly systems: System[] = []

    private previousTimestamp: number = 0
    frame: number = 0
    currentTime: number = 0
    deltaTime: number
    constructor(systems: SystemType<any>[]){
        this.canvas.width = 600
        this.canvas.height = 400
        this.gl = this.canvas.getContext('webgl2', {
            alpha: false, antialias: false, depth: true,
            premultipliedAlpha: false, preserveDrawingBuffer: false
        })
        for(let index = 0; index < systems.length; index++){
            //TODO will fail when there are 2 instances of APP
            systems[index].index = index
            this.systems[index] = new systems[index](this)
        }
        ready(() => document.body.appendChild(this.canvas))
    }
    public get<T extends System>(type: SystemType<T>): T { return this.systems[type.index] as T }
    update = (currentTime: number) => {
        this.deltaTime = 1e-3 * Math.min(Application.timestep, currentTime - this.previousTimestamp)
        this.previousTimestamp = currentTime
        this.currentTime += this.deltaTime
        this.frame++

        for(let i = 0; i < this.systems.length; i++) this.systems[i].update()
        requestAnimationFrame(this.update)
    }
    public load(manifest: any){
        const progress = ProgressHandler(this.update.bind(this, 0))
        let totalRemaining = 0
        for(let i = 0; i < this.systems.length; i++){
            if(!this.systems[i].load) continue
            let prevRemaining = 0
            this.systems[i].load(manifest, (remaining, value) => {
                if(remaining == -1) return progress(remaining, value)
                totalRemaining += remaining - prevRemaining
                prevRemaining = remaining
                progress(totalRemaining)
            })
        }    
    }
}