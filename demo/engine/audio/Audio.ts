import { Application, ISystem } from '../framework'

export class AudioSystem implements ISystem {
    private readonly audio: AudioContext
    constructor(private readonly context: Application){
        this.audio = new AudioContext()
        document.addEventListener('visibilitychange', () => document.hidden ? this.audio.suspend() : this.audio.resume())
    }
    public update(): void {
        if(this.context.frame === 1) this.audio.resume()
    }
    public load(): void {

    }
}