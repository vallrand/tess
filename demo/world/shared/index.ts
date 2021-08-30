import { Application, ISystem } from '../../engine/framework'
import { TextureLibrary } from './TextureLibrary'
import { MaterialLibrary } from './MaterialLibrary'
import { ParticleLibrary } from './ParticleLibrary'
import { GeometryLibrary } from './GeometryLibrary'
import { EffectLibrary } from './EffectLibrary'

export class SharedSystem implements ISystem {
    public static textures: ReturnType<typeof TextureLibrary>
    public static materials: ReturnType<typeof MaterialLibrary>
    public static particles: ReturnType<typeof ParticleLibrary>
    public static geometry: ReturnType<typeof GeometryLibrary>
    public static effects: ReturnType<typeof EffectLibrary>

    constructor(private readonly context: Application){
        SharedSystem.textures = TextureLibrary(this.context)
        SharedSystem.materials = MaterialLibrary(this.context)
        SharedSystem.geometry = GeometryLibrary(this.context)
        SharedSystem.particles = ParticleLibrary(this.context)
        SharedSystem.effects = EffectLibrary(this.context)
    }
    public update(): void {}
}