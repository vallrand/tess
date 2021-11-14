import { vec2, mat3x2, vec4 } from '../math'
import { Batch2D, IBatched2D } from '../pipeline/batch'
import { Sprite } from './Sprite'
import { SpriteMaterial } from '../materials'

export class Transform2D {
    private static readonly pool: Transform2D[] = []
    public static create(position?: vec2, scale?: vec2, rotation?: number, parent?: Transform2D): Transform2D {
        const item = this.pool.pop() || new Transform2D()
        vec2.copy(position || vec2.ZERO, item.position)
        vec2.copy(scale || vec2.ONE, item.scale)
        item.rotation = rotation || 0
        item.parent = parent
        return item
    }
    public static delete(item: Transform2D): void {
        this.pool.push(item)
        item.frame = 0
        item.parent = null
    }
    public frame: number = 0
    public readonly position: vec2 = vec2(0,0)
    public readonly scale: vec2 = vec2(1,1)
    public rotation: number = 0
    public readonly matrix: mat3x2 = mat3x2()
    public parent?: Transform2D
    public recalculate(frame: number): void {
        if(frame && this.frame === frame) return
        mat3x2.fromTransform(
            this.position[0], this.position[1], 0, 0,
            this.scale[0], this.scale[1], this.rotation, 0, 0, this.matrix
        )
        if(this.parent){
            this.parent.recalculate(frame)
            mat3x2.multiply(this.parent.matrix, this.matrix, this.matrix)
        }
        this.frame = frame
    }
}

export class Sprite2D implements IBatched2D {
    private static readonly pool: Sprite2D[] = []
    public static create(order?: number, origin?: vec2): Sprite2D {
        const item = this.pool.pop() || new Sprite2D()
        item.order = order || 0
        vec2.copy(origin || vec2.ZERO, item.origin)
        vec4.copy(vec4.ONE, item.color)
        return item
    }
    public static delete(item: Sprite2D): void {
        this.pool.push(item)
        item.frame = 0
        item.material = item.transform = null
    }

    public index: number = -1
    public frame: number = 0
    public order: number = 0

    public readonly vertices: Float32Array = new Float32Array(8)
    public readonly uvs: Float32Array = new Float32Array(8)
    public readonly indices: Uint16Array = Sprite.quadIndices
    public readonly color: vec4 = vec4(1,1,1,1)
    public material: SpriteMaterial
    public transform: Transform2D
    public readonly origin: vec2 = vec2(0,0)

    public update(frame: number){
        if(!this.material) return
        if(this.frame == 0) SpriteMaterial.applyTransform(Sprite.quadUVs, this.material.uvMatrix, this.uvs, 0)
        this.transform.recalculate(frame)
        if(this.frame > 0 && this.frame >= this.transform.frame) return
        const transform = this.transform.matrix

        const a = transform[0], b = transform[1],
        c = transform[2], d = transform[3],
        tx = transform[4], ty = transform[5]
        const width = this.material.size[0]
        const height = this.material.size[1]

        const left = -this.origin[0] * width
        const right = left + width
        const top = -this.origin[1] * height
        const bottom = top + height

        this.vertices[0] = a * left + c * top + tx
        this.vertices[1] = d * top + b * left + ty
        this.vertices[2] = a * right + c * top + tx
        this.vertices[3] = d * top + b * right + ty
        this.vertices[4] = a * right + c * bottom + tx
        this.vertices[5] = d * bottom + b * right + ty
        this.vertices[6] = a * left + c * bottom + tx
        this.vertices[7] = d * bottom + b * left + ty

        this.frame = frame
    }
}