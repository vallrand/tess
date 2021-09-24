import { Application } from '../framework'
import { vec2, vec3, vec4, quat, mat4, mat3x2 } from '../math'
import { Transform, ICamera, BoundingVolume } from '../scene'
import { SpriteMaterial } from '../materials'
import { IBatched } from '../pipeline/batch/GeometryBatch'

export const enum BillboardType {
    None = 0,
    Flat = 1,
    Sphere = 2,
    Cylinder = 3,
    Axial = 4
}

export class Sprite implements IBatched {
    public static readonly FlatUp: quat = quat.axisAngle(vec3.AXIS_X, 0.5 * Math.PI, quat())

    private static readonly quadIndices: Uint16Array = new Uint16Array([0,1,2,0,2,3])
    private static readonly quadUVs: Float32Array = new Float32Array([0,0,1,0,1,1,0,1])
    private static readonly tangent: vec3 = vec3()
    private static readonly binormal: vec3 = vec3()
    private static readonly forward: vec3 = vec3()

    public billboard: BillboardType = BillboardType.None
    public index: number = -1
    public frame: number = 0
    public order: number = 0
    public readonly vertices: Float32Array = new Float32Array(12)
    public readonly uvs: Float32Array = Sprite.quadUVs
    public readonly indices: Uint16Array = Sprite.quadIndices
    public readonly color: vec4 = vec4(1,1,1,1)
    public readonly normal: vec3 = vec3(1,0,0)
    public material: SpriteMaterial
    public transform: Transform
    public readonly bounds = new BoundingVolume
    public readonly origin: vec2 = vec2(0.5, 0.5)

    public update(context: Application, camera: ICamera){
        if(this.frame > 0 && this.frame >= camera.frame && this.frame >= this.transform.frame) return

        const width = 1, height = 1
        const left = -this.origin[0] * width, right = left + width
        const top = -this.origin[1] * height, bottom = top + height

        if(!this.frame || this.frame < this.transform.frame) this.bounds.update(this.transform, Math.max(width, height))
        const transform = this.transform.matrix
        const { tangent, binormal, forward } = Sprite
        const { normal } = this

        switch(this.billboard){
            case BillboardType.None:
                vec3.set(transform[0], transform[1], transform[2], tangent)
                vec3.set(transform[4], transform[5], transform[6], binormal)
                //TODO if flip enabled
                vec3.set(transform[8], transform[9], transform[10], normal)
                vec3.set(camera.viewMatrix[2], camera.viewMatrix[6], camera.viewMatrix[10], forward)

                vec3.scale(tangent, Math.sign(vec3.dot(forward, normal)), tangent)
                break
            case BillboardType.Sphere:
                vec3.set(camera.viewMatrix[0], camera.viewMatrix[4], camera.viewMatrix[8], tangent)
                vec3.set(camera.viewMatrix[1], camera.viewMatrix[5], camera.viewMatrix[9], binormal)

                vec3.scale(tangent, this.transform.scale[0], tangent)
                vec3.scale(binormal, this.transform.scale[1], binormal)
                //mat4.transformNormal(tangent, transform, tangent)
                //mat4.transformNormal(binormal, transform, binormal)
                vec3.cross(tangent, binormal, normal)
                break
            case BillboardType.Cylinder:
                vec3.set(transform[4], transform[5], transform[6], tangent)
                vec3.set(transform[12], transform[13], transform[14], forward)
                vec3.subtract(camera.position, forward, forward)
                //const forward = vec3.set(camera.viewMatrix[2], camera.viewMatrix[6], camera.viewMatrix[10], Sprite.forward) //flat
                vec3.cross(forward, tangent, binormal)
                vec3.normalize(binormal, binormal)
                vec3.scale(binormal, Math.hypot(transform[0], transform[1], transform[2]), binormal)
                vec3.cross(tangent, binormal, normal)
                break
        }
        this.vertices[0] = tangent[0] * left + binormal[0] * top + transform[12]
        this.vertices[1] = tangent[1] * left + binormal[1] * top + transform[13]
        this.vertices[2] = tangent[2] * left + binormal[2] * top + transform[14]

        this.vertices[3] = tangent[0] * right + binormal[0] * top + transform[12]
        this.vertices[4] = tangent[1] * right + binormal[1] * top + transform[13]
        this.vertices[5] = tangent[2] * right + binormal[2] * top + transform[14]

        this.vertices[6] = tangent[0] * right + binormal[0] * bottom + transform[12]
        this.vertices[7] = tangent[1] * right + binormal[1] * bottom + transform[13]
        this.vertices[8] = tangent[2] * right + binormal[2] * bottom + transform[14]

        this.vertices[9] = tangent[0] * left + binormal[0] * bottom + transform[12]
        this.vertices[10] = tangent[1] * left + binormal[1] * bottom + transform[13]
        this.vertices[11] = tangent[2] * left + binormal[2] * bottom + transform[14]

        this.frame = context.frame
    }
}