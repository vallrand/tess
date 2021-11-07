import { vec2, mat3x2, aabb2, vec4, vec3 } from '../math'
import { GL, ShaderProgram } from '../webgl'
import { Batch2D, IBatched2D } from '../pipeline/batch'
import { ShaderMaterial } from '../materials'
import { IMaterial } from '../pipeline'

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

export class Sprite2DMaterial extends ShaderMaterial implements IMaterial {
    public static create(texture: WebGLTexture, frame: aabb2, size: vec2): Sprite2DMaterial {
        const material = new Sprite2DMaterial()
        Sprite2DMaterial.calculateUVMatrix(frame, size, material.uvMatrix)
        vec2.set(frame[2] - frame[0], frame[3] - frame[1], material.size)
        material.diffuse = texture
        return material
    }
    public static calculateUVMatrix(frame: aabb2, size: vec2, out: mat3x2): mat3x2 {
        out[0] = (frame[2] - frame[0] - 1) / size[0]
        out[1] = 0
        out[2] = 0
        out[3] = (frame[3] - frame[1] - 1) / size[1]
        out[4] = (frame[0] + 0.5) / size[0]
        out[5] = (frame[1] + 0.5) / size[1]
        return out
    }
    readonly size: vec2 = vec2(1,1)
    readonly uvMatrix: mat3x2 = mat3x2()
    diffuse: WebGLTexture
    normal?: WebGLTexture
    depthWrite: boolean = false
    cullFace: number = GL.BACK
    depthTest: number = GL.LEQUAL
    blendMode = ShaderMaterial.Premultiply
    merge(material: IMaterial): boolean {
        return super.merge(material) && (
            'uSamplers' in this.program.uniforms ||
            this.diffuse === (material as Sprite2DMaterial).diffuse
        )
    }
}

export class Sprite2D implements IBatched2D {
    private static readonly pool: Sprite2D[] = []
    public static create(order?: number, origin?: vec2): Sprite2D {
        const item = this.pool.pop() || new Sprite2D()
        item.order = order || 0
        vec2.copy(origin || vec2.ZERO, item.origin)
        return item
    }
    public static delete(item: Sprite2D): void {
        this.pool.push(item)
        item.frame = 0
        item.material = item.transform = null
    }

    private static readonly quadIndices: Uint16Array = new Uint16Array([0,1,2,0,2,3])
    private static readonly quadUVs: Float32Array = new Float32Array([0,0,1,0,1,1,0,1]) 

    public index: number = -1
    public frame: number = 0
    public order: number = 0

    public readonly vertices: Float32Array = new Float32Array(8)
    public readonly uvs: Float32Array = new Float32Array(8)
    public readonly indices: Uint16Array = Sprite2D.quadIndices
    public readonly color: vec4 = vec4(1,1,1,1)
    public material: Sprite2DMaterial
    public transform: Transform2D
    public readonly origin: vec2 = vec2(0,0)

    public update(frame: number){
        if(!this.material) return
        if(this.frame == 0)
            this.applyTransform(Sprite2D.quadUVs, this.material.uvMatrix, this.uvs, 0)
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