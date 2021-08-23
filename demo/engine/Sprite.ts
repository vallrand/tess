import { vec2, mat3x2, aabb2, vec4, vec3 } from './math'
import { Application, System, Factory } from './framework'
import { ShaderProgram } from './webgl'
import { Batch2D, IBatched2D } from './batch'
import { Transform2D } from './Transform'

export class SpriteMaterial {
    public static calculateUVMatrix(frame: aabb2, size: vec2, out: mat3x2): mat3x2 {
        out[0] = (frame[2] - frame[0] - 1) / size[0]
        out[1] = 0
        out[2] = 0
        out[3] = (frame[3] - frame[1] - 1) / size[1]
        out[4] = (frame[0] + 0.5) / size[0]
        out[5] = (frame[1] + 0.5) / size[1]
        return out
    }
    readonly size: vec2 = vec2(0,0)
    readonly uvMatrix: mat3x2 = mat3x2()
    texture: WebGLTexture
    program?: ShaderProgram
    tint: vec3 = vec3(0, 0, 0)
}

export class Sprite2D implements IBatched2D {
    private static readonly quadIndices: Uint16Array = new Uint16Array([0,1,2,0,2,3])
    private static readonly quadUVs: Float32Array = new Float32Array([0,0,1,0,1,1,0,1]) 

    public index: number = -1
    public frame: number = 0
    public order: number = 0

    public readonly vertices: Float32Array = new Float32Array(8)
    public readonly uvs: Float32Array = new Float32Array(8)
    public readonly indices: Uint16Array = Sprite2D.quadIndices
    public readonly color: vec4 = vec4(1,1,1,1)
    public material: SpriteMaterial
    public transform: Transform2D
    public readonly origin: vec2 = vec2(0,0)

    public recalculate(frame: number){
        if(!this.material) return
        if(this.frame == 0)
            this.applyTransform(Sprite2D.quadUVs, this.material.uvMatrix, this.uvs, 0)
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
    private applyTransform(vertices: Float32Array, transform: mat3x2, out: Float32Array, offset: number = 0){
        const a = transform[0], b = transform[1],
        c = transform[2], d = transform[3],
        tx = transform[4], ty = transform[5]
        for(let i = vertices.length - 1; i > 0; i-=2){
            const x = vertices[i - 1], y = vertices[i]
            out[offset + i - 1] = a * x + c * y + tx
            out[offset + i] = b * x + d * y + ty
        }
    }
}


export class SpriteSystem extends Factory<Sprite2D> implements System {
    constructor(private readonly context: Application){super(Sprite2D)}
    public delete(sprite: Sprite2D): void {
        super.delete(sprite)
        sprite.frame = 0
    }
    public update(){
        //merge into single batch mesh?
        for(let i = this.list.length - 1; i >= 0; i--){
        }
    }
    public createMaterial(texture: WebGLTexture, frame: aabb2, size: vec2): SpriteMaterial {
        const material = new SpriteMaterial()
        SpriteMaterial.calculateUVMatrix(frame, size, material.uvMatrix)
        vec2.set(frame[2] - frame[0], frame[3] - frame[1], material.size)
        material.texture = texture
        return material
    }
}