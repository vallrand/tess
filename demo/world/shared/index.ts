import { Application, ISystem } from '../../engine/framework'
import { TextureLibrary } from './TextureLibrary'
import { MaterialLibrary } from './MaterialLibrary'
import { ParticleLibrary } from './ParticleLibrary'
import { GeometryLibrary } from './GeometryLibrary'
import { EffectLibrary } from './EffectLibrary'

import { DebrisEffect, GridEffect } from './effects'

export class SharedSystem implements ISystem {
    public static textures: ReturnType<typeof TextureLibrary>
    public static materials: ReturnType<typeof MaterialLibrary>
    public static particles: ReturnType<typeof ParticleLibrary>
    public static geometry: ReturnType<typeof GeometryLibrary>
    public static effects: ReturnType<typeof EffectLibrary>

    public debris: DebrisEffect
    public grid: GridEffect

    constructor(private readonly context: Application){
        SharedSystem.textures = TextureLibrary(this.context)
        SharedSystem.materials = MaterialLibrary(this.context)
        SharedSystem.geometry = GeometryLibrary(this.context)
        SharedSystem.particles = ParticleLibrary(this.context)
        SharedSystem.effects = EffectLibrary(this.context)
    }
    public update(): void {}
    public load(): void {
        this.debris = new DebrisEffect(this.context, 'cube_debris')
        this.grid = new GridEffect(this.context, 10)
    }
}