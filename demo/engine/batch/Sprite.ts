import { Application } from '../framework'
import { vec2, vec3, vec4, mat4, mat3x2, aabb2 } from '../math'
import { ICamera } from '../scene/Camera'
import { IBatched } from './GeometryBatch'
import { Transform } from '../scene/Transform'
import { BoundingVolume } from '../scene/FrustumCulling'
import { IMaterial } from '../Material'
import { GL, ShaderProgram } from '../webgl'

export const enum BillboardType {
    None = 0,
    Flat = 1,
    Sphere = 2,
    Cylinder = 3,
    Axial = 4
}

export class SpriteMaterial implements IMaterial {
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
    program: ShaderProgram
    domain: vec3 = vec3(0,0,0)
    bind(gl: WebGL2RenderingContext): void {
        gl.enable(GL.CULL_FACE)
        gl.cullFace(GL.BACK)
        gl.enable(GL.DEPTH_TEST)
        gl.depthFunc(GL.LEQUAL)
        gl.enable(GL.BLEND)
        gl.blendEquation(GL.FUNC_ADD)
        gl.blendFuncSeparate(GL.ONE, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE)
    }
    merge(material: IMaterial): boolean {
        return this === material ||
        this.program === material.program && (
            'uSamplers' in this.program.uniforms ||
            this.diffuse === (material as SpriteMaterial).diffuse
        )
    }
}

export class Sprite implements IBatched {
    private static readonly quadIndices: Uint16Array = new Uint16Array([0,1,2,0,2,3])
    private static readonly quadUVs: Float32Array = new Float32Array([0,0,1,0,1,1,0,1])
    private static readonly normal: vec3 = vec3()
    private static readonly tangent: vec3 = vec3()
    private static readonly forward: vec3 = vec3()

    public billboard: BillboardType = BillboardType.None
    public index: number = -1
    public frame: number = 0
    public order: number = 0
    public readonly vertices: Float32Array = new Float32Array(12)
    public readonly uvs: Float32Array = new Float32Array(Sprite.quadUVs)
    public readonly indices: Uint16Array = Sprite.quadIndices
    public readonly color: vec4 = vec4(1,1,1,1)
    public material: SpriteMaterial
    public transform: Transform
    public readonly bounds = new BoundingVolume
    public readonly origin: vec2 = vec2(0.5, 0.5)

    public update(context: Application, camera: ICamera){
        if(this.frame == 0 && this.material)
            this.applyTransform2D(Sprite.quadUVs, this.material.uvMatrix, this.uvs, 0)

        if(this.frame > 0 && this.frame >= camera.frame && this.frame >= this.transform.frame) return

        const width = this.material.size[0], height = this.material.size[1]
        const left = -this.origin[0] * width, right = left + width
        const top = -this.origin[1] * height, bottom = top + height

        if(!this.frame || this.frame < this.transform.frame) this.bounds.update(this.transform, Math.max(width, height))
        const transform = this.transform.matrix
        const { normal, tangent } = Sprite

        switch(this.billboard){
            case BillboardType.None:
                vec3.set(transform[0], transform[1], transform[2], normal)
                vec3.set(transform[4], transform[5], transform[6], tangent)
                break
            case BillboardType.Sphere:
                vec3.set(camera.viewMatrix[0], camera.viewMatrix[4], camera.viewMatrix[8], normal)
                vec3.set(camera.viewMatrix[1], camera.viewMatrix[5], camera.viewMatrix[9], tangent)
                mat4.transformNormal(normal, transform, normal)
                mat4.transformNormal(tangent, transform, tangent)
                break
            case BillboardType.Cylinder:
                vec3.set(transform[4], transform[5], transform[6], normal)
                const forward = vec3.set(transform[12], transform[13], transform[14], Sprite.forward)
                vec3.subtract(camera.position, forward, forward)
                //const forward = vec3.set(camera.viewMatrix[2], camera.viewMatrix[6], camera.viewMatrix[10], Sprite.forward) //flat
                vec3.cross(forward, normal, tangent)
                vec3.normalize(tangent, tangent)
                vec3.scale(tangent, Math.hypot(transform[0], transform[1], transform[2]), tangent)
                break
        }
        this.vertices[0] = normal[0] * left + tangent[0] * top + transform[12]
        this.vertices[1] = normal[1] * left + tangent[1] * top + transform[13]
        this.vertices[2] = normal[2] * left + tangent[2] * top + transform[14]

        this.vertices[3] = normal[0] * right + tangent[0] * top + transform[12]
        this.vertices[4] = normal[1] * right + tangent[1] * top + transform[13]
        this.vertices[5] = normal[2] * right + tangent[2] * top + transform[14]

        this.vertices[6] = normal[0] * right + tangent[0] * bottom + transform[12]
        this.vertices[7] = normal[1] * right + tangent[1] * bottom + transform[13]
        this.vertices[8] = normal[2] * right + tangent[2] * bottom + transform[14]

        this.vertices[9] = normal[0] * left + tangent[0] * bottom + transform[12]
        this.vertices[10] = normal[1] * left + tangent[1] * bottom + transform[13]
        this.vertices[11] = normal[2] * left + tangent[2] * bottom + transform[14]

        this.frame = context.frame
    }
    private applyTransform2D(vertices: Float32Array, transform: mat3x2, out: Float32Array, offset: number = 0){
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