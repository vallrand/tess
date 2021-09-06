import { Application } from '../../../engine/framework'
import { vec3, vec4 } from '../../../engine/math'
import { ShaderProgram, GL } from '../../../engine/webgl'
import { shaders } from '../../../engine/shaders'
import { TransformSystem, Transform } from '../../../engine/scene'
import { DecalMaterial } from '../../../engine/materials'
import { DecalPass, Decal } from '../../../engine/pipeline'

export class GridEffect {
    public material: DecalMaterial
    public decal: Decal
    constructor(private readonly context: Application, readonly gridSize: number){
        this.material = new DecalMaterial()
        this.material.program = ShaderProgram(this.context.gl,
            shaders.decal_vert, require('../../shaders/grid_frag.glsl'), {
                INSTANCED: true, WORLD: true
        })
        this.material.blendMode = [[GL.FUNC_ADD],[GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.ONE]]
        this.material.program.uniforms['uGridSize'] = 1 / gridSize        

        this.decal = this.context.get(DecalPass).create(1)
        this.decal.transform = this.context.get(TransformSystem).create()
        vec3.set(2*gridSize, 10, 2*gridSize, this.decal.transform.scale)
        this.decal.material = this.material
    }
    set enabled(value: boolean){ vec4.copy(value ? vec4.ONE : vec4.ZERO, this.decal.color) }
    get enabled(): boolean { return this.decal.color[3] != 0 }
}