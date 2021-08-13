import { Application, System } from '../framework'

export abstract class PipelinePass implements System {
    constructor(protected readonly context: Application){}
    public abstract update(): void
}

export interface IEffect {
    priority?: number
    enabled: boolean
    apply(): void
}