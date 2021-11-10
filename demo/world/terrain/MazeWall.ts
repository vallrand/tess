import { Application } from '../../engine/framework'
import { vec3, vec4, quat, mat4 } from '../../engine/math'
import { TerrainSystem } from './Terrain'
import { MeshSystem, Mesh } from '../../engine/components'
import { OpaqueLayer } from '../../engine/webgl'
import { TransformSystem, Transform } from '../../engine/scene'
import { SharedSystem } from '../shared'
import { ModelBatch, IModelInstance } from '../../engine/pipeline/batch'
import { DirectionAngle, Direction } from '../player'

export class MazeWall {
    private static readonly transform: mat4 = mat4()
    private static readonly position: vec3 = vec3()
    private static readonly orientations = [
        { rotation: DirectionAngle[Direction.Right], models: ['wall_O_0', 'wall_O_1'] },
        { rotation: DirectionAngle[Direction.Up], models: ['wall_U_0', 'wall_U_1', 'wall_U_2'] },
        { rotation: DirectionAngle[Direction.Right], models: ['wall_U_0', 'wall_U_1', 'wall_U_2'] },
        { rotation: DirectionAngle[Direction.Up], models: ['wall_L_0', 'wall_L_1'] },
        { rotation: DirectionAngle[Direction.Down], models: ['wall_U_0', 'wall_U_1', 'wall_U_2'] },
        { rotation: DirectionAngle[Direction.Down], models: ['wall_I_0', 'wall_I_1', 'wall_I_2', 'wall_I_3'] },
        { rotation: DirectionAngle[Direction.Right], models: ['wall_L_0', 'wall_L_1'] },
        { rotation: DirectionAngle[Direction.Left], models: ['wall_T_0'] },
        { rotation: DirectionAngle[Direction.Left], models: ['wall_U_0', 'wall_U_1', 'wall_U_2'] },
        { rotation: DirectionAngle[Direction.Left], models: ['wall_L_0', 'wall_L_1'] },
        { rotation: DirectionAngle[Direction.Right], models: ['wall_I_0', 'wall_I_1', 'wall_I_2', 'wall_I_3'] },
        { rotation: DirectionAngle[Direction.Down], models: ['wall_T_0'] },
        { rotation: DirectionAngle[Direction.Down], models: ['wall_L_0', 'wall_L_1'] },
        { rotation: DirectionAngle[Direction.Right], models: ['wall_T_0'] },
        { rotation: DirectionAngle[Direction.Up], models: ['wall_T_0'] },
        { rotation: DirectionAngle[Direction.Right], models: ['wall_X_0'] }
    ]
    public readonly weight: number = 0
    private readonly batch: ModelBatch = new ModelBatch(this.context, 0xFFFF, 0xFFFF)
    private mesh: Mesh
    constructor(private readonly context: Application){}
    set(column: number, row: number, orientation: number, random: number){
        const { rotation, models } = MazeWall.orientations[orientation]
        const position = this.context.get(TerrainSystem).tilePosition(column, row, MazeWall.position)
        const transform = mat4.fromRotationTranslationScale(rotation, position, vec3.ONE, MazeWall.transform)
        const key = models[random * models.length | 0]
        const model = this.context.get(MeshSystem).models[key]
        if(!this.batch.render({
            format: model.geometry.format,
            vertices: model.geometry.vertexArray,
            indices: model.geometry.indexArray,
            transform: transform
        })) throw new Error(`${key}(${column},${row})`)
    }
    build(){
        this.mesh = this.context.get(MeshSystem).create()
        this.mesh.layer = OpaqueLayer.Static
        this.batch.bind()
        this.mesh.buffer = this.batch.buffer
        this.mesh.transform = Transform.IDENTITY
        this.mesh.material = SharedSystem.materials.mesh.metal
    }
    clear(){
        this.context.get(MeshSystem).delete(this.mesh)
    }
    delete(){

    }
}