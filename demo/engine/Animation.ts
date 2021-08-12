import { Application, System, Factory } from './framework'

export interface IBehaviour {
    update(context: Application): void
}

export class AnimationSystem implements System {
    constructor(private readonly context: Application){
    }
    public update(): void {}
    public add(behaviour: IBehaviour): void {
        
    }
}