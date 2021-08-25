import { Application, System } from '../../engine/framework'
import { TextureLibrary } from './TextureLibrary'
import { ParticleLibrary } from './ParticleLibrary'
import { GeometryLibrary } from './GeometryLibrary'
import { EffectLibrary } from './EffectLibrary'

export class SharedSystem implements System {
    public static textures: ReturnType<typeof TextureLibrary>
    public static particles: ReturnType<typeof ParticleLibrary>
    public static geometry: ReturnType<typeof GeometryLibrary>
    public static effects: ReturnType<typeof EffectLibrary>

    constructor(private readonly context: Application){
        SharedSystem.textures = TextureLibrary(this.context)
        SharedSystem.geometry = GeometryLibrary(this.context)
        SharedSystem.particles = ParticleLibrary(this.context)
        SharedSystem.effects = EffectLibrary(this.context)
    }
    public update(): void {}
}