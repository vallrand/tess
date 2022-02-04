import { Loader, ILoadedData } from './Loader'
import { WebGLState } from '../webgl'

export interface ISystem {
    update(): void
    load?(manifest: any, data: ILoadedData, next: () => void): void
}
export interface SystemType<T extends ISystem> {
    index?: number
    new (context: Application): T
}

export class Application {
    private static readonly timestep = 2 * 1000/60
    public readonly canvas: HTMLCanvasElement = document.createElement('canvas')
    public readonly gl: WebGL2RenderingContext
    private readonly loader: Loader = new Loader
    private readonly systems: ISystem[] = []

    private previousTimestamp: number = 0
    private timeScale: number = 1
    frame: number = 0
    currentTime: number = 0
    deltaTime: number
    constructor(systems: SystemType<any>[]){
        this.canvas.width = 600
        this.canvas.height = 400
        this.gl = new WebGLState(this.canvas.getContext('webgl2', {
            alpha: false, antialias: false, depth: true, stencil: false,
            premultipliedAlpha: false, preserveDrawingBuffer: false
        }))
        for(let index = 0; index < systems.length; index++){
            if(systems[index].index == null) systems[index].index = index
            this.systems[systems[index].index] = new systems[index](this)
        }
        Loader.awaitDocumentLoad(() => document.body.prepend(this.canvas))
    }
    public get<T extends ISystem>(type: SystemType<T>): T { return this.systems[type.index] as T }
    update = (currentTime: number) => {
        this.deltaTime = this.timeScale * 1e-3 * Math.min(Application.timestep, currentTime - this.previousTimestamp)
        this.previousTimestamp = currentTime
        this.currentTime += this.deltaTime
        this.frame++

        for(let i = 0; i < this.systems.length; i++) this.systems[i].update()
        requestAnimationFrame(this.update)
    }
    public load(manifest: any){
        function next(this: Application, i: number, data: ILoadedData){
            if(i === this.systems.length) Loader.awaitUserGesture(() => this.update(0))
            else if(!this.systems[i].load) next.call(this, i + 1, data)
            else this.systems[i].load(manifest, data, next.bind(this, i + 1, data))
        }
        this.loader.load(manifest, next.bind(this, 0))
    }
}