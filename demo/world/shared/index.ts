import { Application, ISystem } from '../../engine/framework'
import { mulberry32 } from '../../engine/math'
import { DeferredGeometryPass, ParticleEffectPass, PostEffectPass } from '../../engine/pipeline'
import { TextureLibrary } from './TextureLibrary'
import { GradientLibrary } from './GradientLibrary'
import { MaterialLibrary } from './MaterialLibrary'
import { ParticleLibrary } from './ParticleLibrary'
import { GeometryLibrary } from './GeometryLibrary'
import { EffectLibrary } from './EffectLibrary'

import {
    DebrisEffect, GridEffect, SkyEffect, MistEffect
} from './effects'

export * from './ModelAnimation'

export class SharedSystem implements ISystem {
    public static readonly random = mulberry32()
    public static textures: ReturnType<typeof TextureLibrary>
    public static gradients: ReturnType<typeof GradientLibrary>
    public static materials: ReturnType<typeof MaterialLibrary>
    public static particles: ReturnType<typeof ParticleLibrary>
    public static geometry: ReturnType<typeof GeometryLibrary>
    public static effects: ReturnType<typeof EffectLibrary>

    public debris: DebrisEffect
    public grid: GridEffect
    public sky: SkyEffect
    public mist: MistEffect

    constructor(private readonly context: Application){
        SharedSystem.textures = TextureLibrary(this.context)
        SharedSystem.gradients = GradientLibrary(this.context)
        SharedSystem.materials = MaterialLibrary(this.context)
        SharedSystem.geometry = GeometryLibrary(this.context)
        SharedSystem.particles = ParticleLibrary(this.context)
        SharedSystem.effects = EffectLibrary(this.context)
    }
    public update(): void {}
    public load(): void {
        this.sky = new SkyEffect(this.context)
        this.context.get(DeferredGeometryPass).effects.push(this.sky)
        this.debris = new DebrisEffect(this.context, 'cube_debris')
        this.grid = new GridEffect(this.context, 10)
        
        this.mist = new MistEffect(this.context, 256, [-8,0,-8,8,6,8])
        this.context.get(ParticleEffectPass).effects.push(this.mist)

        // this.grid.enabled = false
        this.mist.enabled = false
        //this.sky.enabled = false
    }
}