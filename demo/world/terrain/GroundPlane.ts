import { vec2, vec3, quat, range, randomFloat, mulberry32 } from '../../engine/math'
import { createPlane } from '../../engine/geometry'
import { OpaqueLayer } from '../../engine/webgl'
import { Application } from '../../engine/framework'
import { StaticParticleEmitter } from '../../engine/particles'
import { MeshSystem, Mesh, MeshBuffer } from '../../engine/components'
import { Decal, DecalPass } from '../../engine/pipeline'
import { TransformSystem } from '../../engine/scene'
import { SharedSystem } from '../shared'

export class GroundPlane {
    public mesh: Mesh
    readonly decals: Decal[] = []
    public foliage: StaticParticleEmitter
    private readonly foliageOptions = {
        uOrigin: range(10).map(i => vec3()),
        uRadius: vec2(0,4),
        uSize: vec2(0.6,1.8)
    }

    public readonly heightmap: Float32Array
    public readonly vertexArray: Float32Array
    public readonly vertexBuffer: MeshBuffer
    private readonly stride: number
    constructor(
        private readonly context: Application,
        private readonly parent: {
            readonly column: number
            readonly row: number
        },
        private readonly columns: number,
        private readonly rows: number,
        private readonly size: number
    ){
        const { vertexArray, indexArray, format } = createPlane({
            columns, rows, width: this.size, height: this.size
        })
        this.heightmap = new Float32Array((columns + 3) * (rows + 3))
        this.vertexArray = vertexArray
        this.vertexBuffer = this.context.get(MeshSystem).uploadVertexData(vertexArray, indexArray, format)
        this.stride = this.vertexBuffer.format[1].stride >>> 2
    }
    public build(): void {
        const rows0 = this.rows + 1, rows1 = this.rows + 3
        for(let c = 0; c <= this.columns; c++)
        for(let r = 0; r <= this.rows; r++){
            const index = (c * rows0 + r) * this.stride
            this.vertexArray[index + 1] = this.heightmap[(c + 1) * rows1 + (r + 1)]
            const right = this.heightmap[(c + 2) * rows1 + (r + 1)]
            const left = this.heightmap[(c + 0) * rows1 + (r + 1)]
            const top = this.heightmap[(c + 1) * rows1 + (r + 2)]
            const bottom = this.heightmap[(c + 1) * rows1 + (r + 0)]

            const normal: vec3 = this.vertexArray.subarray(index + 3, index + 6) as any
            vec3.set(2 * (right - left), 4, 2 * (bottom - top), normal)
            vec3.normalize(normal, normal)
        }

        this.mesh = this.context.get(MeshSystem).create()
        this.context.get(MeshSystem).updateVertexData(this.vertexBuffer, this.vertexArray)
        this.mesh.layer = OpaqueLayer.Terrain
        this.mesh.buffer = this.vertexBuffer
        this.mesh.buffer.frame = 0
        this.mesh.transform = this.context.get(TransformSystem).create()
        vec3.set(this.parent.column * this.size, 0, this.parent.row * this.size, this.mesh.transform.position)
        this.mesh.material = SharedSystem.materials.dunesMaterial

        const random = mulberry32(0x7C)
        for(let i = this.foliageOptions.uOrigin.length - 1; i >= 0; i--){
            const origin = this.foliageOptions.uOrigin[i]
            origin[0] = randomFloat(0, this.size, random()) - 0.5 * this.size + this.mesh.transform.position[0]
            origin[2] = randomFloat(0, this.size, random()) - 0.5 * this.size + this.mesh.transform.position[2]
            origin[1] = this.sample(origin[0], origin[2])

            const decal = this.context.get(DecalPass).create(1)
            decal.material = SharedSystem.materials.mossMaterial
            const size = randomFloat(4, 12, random())
            decal.transform = this.context.get(TransformSystem).create(origin, quat.IDENTITY, [size,10,size])
            quat.axisAngle(vec3.AXIS_Y, random() * 2 * Math.PI, decal.transform.rotation)
            this.decals.push(decal)
        }
        this.foliage = SharedSystem.particles.foliage.start(128, this.foliageOptions)
    }
    public sample(x: number, z: number): number {
        const rows0 = this.rows + 1, rows1 = this.rows + 3
        const column = (x / this.size - this.parent.column + 0.5) * rows0
        const row = (z / this.size - this.parent.row + 0.5) * rows0
        const ic = column | 0, ir = row | 0
        return this.heightmap[(ic + 1) * rows1 + (ir + 1)]
    }
    public clear(): void {
        this.context.get(TransformSystem).delete(this.mesh.transform)
        this.context.get(MeshSystem).delete(this.mesh)
        this.mesh = null

        SharedSystem.particles.foliage.stop(this.foliage)
        while(this.decals.length){
            const decal = this.decals.pop()
            this.context.get(TransformSystem).delete(decal.transform)
            this.context.get(DecalPass).delete(decal)
        }
    }
    delete(){
        this.context.get(MeshSystem).unloadVertexData(this.vertexBuffer)
    }
}