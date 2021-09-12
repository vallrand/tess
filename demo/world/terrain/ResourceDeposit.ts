import { Application } from '../../engine/framework'
import { vec2, vec3 } from '../../engine/math'
import { ShaderProgram } from '../../engine/webgl'
import { shaders } from '../../engine/shaders'
import { Transform, TransformSystem } from '../../engine/scene'
import { StaticParticleEmitter } from '../../engine/particles'
import { Decal, DecalPass } from '../../engine/pipeline'
import { DecalMaterial } from '../../engine/materials'
import { TerrainSystem } from './Terrain'
import { SharedSystem } from '../shared'

export class ResourceSpot {
    readonly tile: vec2 = vec2()
    decal: Decal
    emitter: StaticParticleEmitter

    capacity: number
    amount: number
    constructor(private readonly context: Application, private readonly parent: ResourceDeposit){}
    place(column: number, row: number){
        vec2.set(column, row, this.tile)
        this.capacity = this.amount = 4
        
        this.decal = this.context.get(DecalPass).create(8)
        this.decal.transform = this.context.get(TransformSystem).create(null, null, vec3(10,2,10))
        this.context.get(TerrainSystem).tilePosition(column, row, this.decal.transform.position)

        this.decal.material = this.parent.spotMaterial
        this.decal.order = 8

        this.emitter = SharedSystem.particles.glow.start(16, {
            uLifespan: [1,2,-3,0],
            uOrigin: this.decal.transform.position,
            uRadius: [0,1.8],
            uSize: [0.2,0.6],
            uGravity: [0,4.2,0]
        })
    }
    kill(){
        this.context.get(TransformSystem).delete(this.decal.transform)
        this.context.get(DecalPass).delete(this.decal)
        this.parent.delete(this)
        SharedSystem.particles.glow.stop(this.emitter)
    }
}

export class ResourceDeposit {
    pool: ResourceSpot[] = []
    list: ResourceSpot[] = []
    spotMaterial: DecalMaterial
    constructor(private readonly context: Application){
        this.spotMaterial = new DecalMaterial()
        this.spotMaterial.program = ShaderProgram(this.context.gl, shaders.decal_vert, require('../shaders/spot_frag.glsl'), {
            INSTANCED: true, ALPHA_CUTOFF: 0.01
        })
        this.spotMaterial.program.uniforms['uLayer'] = 1
    }
    public create(column: number, row: number): ResourceSpot {
        const spot = this.pool.pop() || new ResourceSpot(this.context, this)
        this.list.push(spot)
        spot.place(column, row)

        this.context.get(TerrainSystem).chunk(column, row).list.push(spot as any)

        return spot
    }
    public delete(component: ResourceSpot): void {
        const index = this.list.indexOf(component)
        if(index == -1) return
        this.pool.push(component)
        this.list[index] = this.list[this.list.length - 1]
        this.list.length--

        const chunk = this.context.get(TerrainSystem).chunk(component.tile[0], component.tile[1])
        chunk.list.splice(chunk.list.indexOf(component as any), 1)
    }
    public get(column: number, row: number): ResourceSpot | null {
        for(let i = this.list.length - 1; i >= 0; i--)
            if(this.list[i].tile[0] === column && this.list[i].tile[1] === row)
                return this.list[i]
        return null
    }
}