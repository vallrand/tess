import { Application } from '../../engine/framework'
import { lerp, vec2, vec4, aabb2 } from '../../engine/math'
import { GL, ShaderProgram } from '../../engine/webgl'
import { MaterialSystem, TextureAtlas } from '../../engine/materials'
import { OverlayPass } from '../../engine/pipeline'
import { MeshSystem, Transform2D, Sprite2D, Sprite2DMaterial } from '../../engine/components'
import { AnimationSystem, ActionSignal, AnimationTimeline, PropertyAnimation, ease } from '../../engine/animation'
import { SharedSystem } from '../shared'
import { Cube } from './Cube'

interface AtlasRegion {
    readonly atlas: TextureAtlas
    readonly bounds: aabb2
    readonly material: Sprite2DMaterial
    readonly program: ShaderProgram
    render(uniforms: Record<string, number | number[]>, clear?: vec4): void
}
function AtlasRegionFactory(context: Application){
    const materials = context.get(MaterialSystem)
    const texture = materials.createRenderTexture(1024, 1024, 1, { filter: GL.LINEAR, wrap: GL.CLAMP_TO_EDGE, mipmaps: GL.NONE })
    const atlas = new TextureAtlas(context.gl, texture, context.get(MeshSystem).plane)
    return function(size: number, program: ShaderProgram): AtlasRegion {
        const bounds = atlas.insert(size, size)
        const material = Sprite2DMaterial.create(atlas.texture.target, bounds, atlas.size)
        material.program = context.get(OverlayPass).program
        return { material, bounds, atlas, program, render: atlas.render.bind(atlas, bounds, program) }
    }
}

class RadialBar {
    protected readonly uniforms: {
        uRadius: vec2
        uSegments: vec2
        uAngle: vec2
        uColor: vec4
        uStrokeWidth: number
        uStrokeColor: vec4
    }
    protected readonly radialMaterial: AtlasRegion
    protected readonly effectMaterial: AtlasRegion
    protected readonly radial: Sprite2D
    protected readonly effect: Sprite2D
    protected readonly rotation: number
    protected readonly colors: vec4[]
    protected index: number
    protected frame: number = 0
    protected prevCapacity: number = 0
    protected prevValue: number = 0
    protected capacity: number = 0
    protected value: number = 0
    constructor(protected readonly context: Application, options: {
        index: number
        radius: vec2
        colors: vec4[]
        rotation: number
        angle: number
        size: number
    }){
        this.index = options.index
        this.rotation = options.rotation
        this.colors = options.colors
        this.radialMaterial = Indicator.create(options.size, SharedSystem.materials.radialProgram)
        this.effectMaterial = Indicator.create(options.size, SharedSystem.materials.radialProgram)
        this.radial = Sprite2D.create(0, [0.5,0.5])
        this.radial.material = this.radialMaterial.material
        this.radial.transform = Transform2D.create([0.5*options.size,0.5*options.size])
        this.effect = Sprite2D.create(1, [0.5,0.5])
        this.effect.material = this.effectMaterial.material
        this.effect.transform = Transform2D.create([0.5*options.size,0.5*options.size])
        this.context.get(OverlayPass).add(this.radial)
        this.context.get(OverlayPass).add(this.effect)
        this.uniforms = {
            uStrokeWidth: 0.016, uStrokeColor: vec4(0.75, 0.87, 0.87, 0.8), uAngle: vec2(0.04, options.angle),
            uSegments: vec2.ZERO, uColor: vec4.ZERO, uRadius: options.radius
        }
    }
    public update(capacity: number, value: number): void {
        if(capacity === this.capacity && value === this.value) return
        const elapsed = this.context.frame - this.frame
        if(elapsed > 10){
            this.prevCapacity = this.capacity
            this.prevValue = this.value
        }
        this.frame = this.context.frame
        this.capacity = capacity
        this.value = value

        const delta = this.updateTexture(this.prevCapacity, this.prevValue)

        this.context.get(AnimationSystem).start(this.animate(delta), true)
    }
    protected updateTexture(prevCapacity: number, prevValue: number): number {
        this.radialMaterial.render({ ...this.uniforms, uColor: this.colors[0], uSegments: [this.capacity, this.capacity] }, vec4.ZERO)
        this.radialMaterial.render({ ...this.uniforms, uColor: this.colors[1], uSegments: [this.value, this.capacity] })
        if(prevCapacity != this.capacity){
            this.effectMaterial.render({ ...this.uniforms, uColor: this.uniforms.uStrokeColor, uSegments: [1,0], uStrokeWidth: 0.04 }, vec4.ZERO)
            return 0
        }else if(prevValue < this.value){
            this.effectMaterial.render({ ...this.uniforms, uColor: this.colors[1], uSegments: [this.value - prevValue, this.capacity] }, vec4.ZERO)
            this.effect.transform.rotation = this.rotation + (prevValue/this.capacity) * Math.PI*2 / this.uniforms.uAngle[1]
            return 1
        }else{
            this.effectMaterial.render({ ...this.uniforms, uColor: this.colors[1], uSegments: [prevValue - this.value, this.capacity] }, vec4.ZERO)
            this.effect.transform.rotation = this.rotation + (this.value/this.capacity) * Math.PI*2 / this.uniforms.uAngle[1]
            return -1
        }
    }
    protected *animate(direction: number): Generator<ActionSignal> {
        let animate: ReturnType<typeof AnimationTimeline>
        //TODO cache animations?
        if(direction == 0) animate = AnimationTimeline(this, {
            'effect.color': PropertyAnimation([
                { frame: 0, value: [1,1,1,0] },
                { frame: 0.4, value: vec4.ZERO, ease: ease.sineIn }
            ], vec4.lerp),
            'radial.transform.rotation': PropertyAnimation([
                { frame: 0, value: this.rotation + 4 * Math.PI * (this.index&1?1:-1) },
                { frame: 0.4, value: this.rotation, ease: ease.cubicOut }
            ], lerp)
        })
        else if(direction > 0) animate = AnimationTimeline(this, {
            'effect.color': PropertyAnimation([
                { frame: 0, value: [1,1,1,0] },
                { frame: 0.4, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp)
        })
        else animate = AnimationTimeline(this, {
            'effect.color': PropertyAnimation([
                { frame: 0, value: vec4.ONE },
                { frame: 0.2, value: [1,0,0,1], ease: ease.quadOut },
                { frame: 0.4, value: vec4.ZERO, ease: ease.quadIn }
            ], vec4.lerp)
        })
        for(const duration = 0.4, startTime = this.context.currentTime; true;){
            const elapsedTime = this.context.currentTime - startTime
            animate(elapsedTime, this.context.deltaTime)
            if(elapsedTime > duration) break
            else yield ActionSignal.WaitNextFrame
        }
    }
}

class DoubleRadialBar extends RadialBar {
    protected updateTexture(prevCapacity: number, prevValue: number): number {
        this.radialMaterial.render({ ...this.uniforms, uColor: this.colors[this.value & 2], uSegments: [2,2] }, vec4.ZERO)
        this.radialMaterial.render({ ...this.uniforms, uColor: this.colors[this.value & 1], uSegments: [1,2] })
        if(prevCapacity != this.capacity){
            this.effectMaterial.render({ ...this.uniforms, uColor: this.uniforms.uStrokeColor, uSegments: [1,0], uStrokeWidth: 0.04 }, vec4.ZERO)
            return 0
        }
        const delta1 = (this.value & 1) - (prevValue & 1)
        const delta2 = (this.value & 2) - (prevValue & 2)
        
        if(delta1 != 0 && delta2 != 0){
            this.effectMaterial.render({ ...this.uniforms, uColor: this.colors[2], uSegments: [2, 2] }, vec4.ZERO)
            this.effectMaterial.render({ ...this.uniforms, uColor: this.colors[1], uSegments: [1, 2] })
            this.effect.transform.rotation = this.rotation
        }else if(delta1 != 0){
            this.effectMaterial.render({ ...this.uniforms, uColor: this.colors[1], uSegments: [1, 2] }, vec4.ZERO)
            this.effect.transform.rotation = this.rotation
        }else if(delta2 != 0){
            this.effectMaterial.render({ ...this.uniforms, uColor: this.colors[2], uSegments: [1, 2] }, vec4.ZERO)
            this.effect.transform.rotation = this.rotation + 1/2 * Math.PI*2 / this.uniforms.uAngle[1]
        }
        return delta2 < 0 || delta1 < 0 ? -1 : 1
    }
}

export class Indicator {
    public static create: ReturnType<typeof AtlasRegionFactory>

    private turnRadial: DoubleRadialBar
    private healthRadial: RadialBar
    private resourceRadial: RadialBar
    private skillRadial: RadialBar

    constructor(private readonly context: Application){
        Indicator.create = AtlasRegionFactory(context) //TODO move elsewhere?
        this.turnRadial = new DoubleRadialBar(this.context, {
            index: 0, radius: vec2(0.10, 0.30), rotation: 0.25*Math.PI, angle: 1, size: 128,
            colors: [vec4(0.08,0.08,0.08,0.4), vec4(0.06, 0.43, 0.36, 0.6), vec4(0.53, 0.06, 0.29, 0.6)]
        })
        this.healthRadial = new RadialBar(this.context, {
            index: 1, radius: vec2(0.38, 0.54), rotation: 0.25*Math.PI, angle: 1, size: 128,
            colors: [vec4(0.08,0.08,0.08,0.4), vec4(0.19, 0.31, 0.38, 0.6)]
        })
        this.resourceRadial = new RadialBar(this.context, {
            index: 2, radius: vec2(0.62, 0.72), rotation: 0*Math.PI, angle: 4/3, size: 128,
            colors: [vec4(0.08,0.08,0.08,0.4), vec4(0.74, 0.73, 0.56, 0.6)]
        })
        this.skillRadial = new RadialBar(this.context, {
            index: 3, radius: vec2(0.80, 0.92), rotation: -0.25*Math.PI, angle: 2, size: 128,
            colors: [vec4(0.08,0.08,0.08,0.4), vec4(0.81, 0.48, 0.11, 0.6)]
        })
    }
    public update(cube: Cube): void {
        this.turnRadial.update(2, cube.movement.amount + cube.action.amount * 2)
        this.healthRadial.update(cube.health.capacity, cube.health.amount)
        this.resourceRadial.update(cube.matter.capacity, cube.matter.amount)
        const skill = cube.skill
        if(skill.indicator) this.skillRadial.update(skill.indicator.capacity, skill.indicator.amount)
        else this.skillRadial.update(0, 0)
    }
}