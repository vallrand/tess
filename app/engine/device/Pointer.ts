import { Application, ISystem } from '../framework'

export class PointerSystem implements ISystem {
    constructor(private readonly context: Application){
        addEventListener('mousemove', (event: MouseEvent) => {

        })
        this.context.canvas.addEventListener('click', () => this.context.canvas.requestPointerLock())
    }
    public update(): void {}
}