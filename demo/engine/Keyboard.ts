import { Application, ISystem } from './framework'

export class KeyboardSystem implements ISystem {
    private readonly keys: Record<string, number> = Object.create(null)
    constructor(private readonly context: Application){
        addEventListener('keydown', (event: KeyboardEvent) => {
            if(this.keys[event.code] > 0) return
            this.keys[event.code] = this.context.frame+1
        })
        addEventListener('keyup', (event: KeyboardEvent) => {
            this.keys[event.code] = -this.context.frame-1
        })
    }
    public update(): void {}
    public down(key: string): boolean { return this.keys[key] > 0 }
    public trigger(key: string): boolean { return this.keys[key] === this.context.frame }
    public release(key: string): boolean { return this.keys[key] === -this.context.frame }
}