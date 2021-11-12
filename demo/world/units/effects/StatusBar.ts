import { Application } from '../../../engine/framework'
import { range, vec3, vec4, quat } from '../../../engine/math'
import { TransformSystem } from '../../../engine/scene/Transform'
import { OverlayPass } from '../../../engine/pipeline'
import { Sprite, BillboardType } from '../../../engine/components'
import { AIUnit } from '../../military'
import { SharedSystem } from '../../shared'

export class StatusBar {
    private static readonly pool: StatusBar[] = []
    public static create(context: Application, unit: AIUnit): StatusBar {
        const item = StatusBar.pool.pop() || new StatusBar(context)
        item.attach(unit)
        return item
    }
    static scale: vec3 = vec3(0.4,0.4,0.4)
    static enabled: vec4 = vec4(1,0.6,0.8,1)
    static disabled: vec4 = vec4(0,0,0,0.8)
    segments: Sprite[]
    constructor(private readonly context: Application){}

    public delete(): void {
        this.context.get(TransformSystem).delete(this.segments[0].transform)
        const overlay = this.context.get(OverlayPass)
        for(let i = this.segments.length - 1; i >= 0; i--){
            const sprite = this.segments[i]
            const index = overlay.list.indexOf(sprite)
            overlay.list[index] = overlay.list[overlay.list.length - 1]
            overlay.list.length--
            Sprite.delete(sprite)
        }
        StatusBar.pool.push(this)
    }
    public attach(unit: AIUnit): void {
        const transform = this.context.get(TransformSystem)
        .create([0,unit.size[0] + 1,0], quat.IDENTITY, StatusBar.scale, unit.mesh.transform)
        this.segments = range(unit.health.capacity).map(i => {
            const sprite = Sprite.create(BillboardType.Sphere, 64)
            sprite.origin[0] = 0.5 + i - 0.5 * unit.health.capacity
            sprite.transform = transform
            sprite.material = SharedSystem.materials.sprite.bar
            this.context.get(OverlayPass).list.push(sprite)
            return sprite
        })
        this.update(unit)
    }
    public update(unit: AIUnit): void {
        for(let i = this.segments.length - 1; i >= 0; i--)
            vec4.copy(unit.health.amount > i ? StatusBar.enabled : StatusBar.disabled, this.segments[i].color)
    }
}