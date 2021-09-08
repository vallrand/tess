import { clamp, lerp, vec2, vec3, vec4, mat4, quat, ease, aabb2, mat3x2 } from '../../engine/math'
import { Application, ISystem } from '../../engine/framework'
import { CameraSystem } from '../../engine/scene/Camera'
import { MaterialSystem, MeshMaterial } from '../../engine/materials'
import { Cube } from './Cube'
import { DebugSystem } from '../../engine/Debug'
import { CubeTileMap } from './CubeTileMap'
import { Transform, TransformSystem } from '../../engine/scene/Transform'
import { DecalPass } from '../../engine/pipeline/DecalPass'
import { ParticleEffectPass } from '../../engine/pipeline/ParticleEffectPass'
import { CubeModule } from './CubeModules'
import { TurnBasedSystem } from '../Actor'
import { CubeSkills } from '../skills'
import { shaders } from '../../engine/shaders'
import { ShaderProgram } from '../../engine/webgl'
import { SharedSystem } from '../shared'
import { MeshSystem } from '../../engine/components'

export class PlayerSystem implements ISystem {
    public readonly cameraTarget: vec3 = vec3(0,0,0)
    public readonly cameraOffset: vec3 = vec3(0, 8, 4)
    private readonly cameraPivot: vec3 = vec3(0,0,0)
    private readonly cameraYaw: quat = quat()
    private readonly cameraPitch: quat = quat()
    private readonly cameraSmoothness: number = 0.1

    public readonly cube: Cube = new Cube(this.context)
    public readonly tilemap: CubeTileMap = new CubeTileMap(this.context)
    public readonly skills = CubeSkills(this.context, this.cube)

    constructor(private readonly context: Application){
        window['orbit'] = (speed = 0.1) => setInterval(() => {
            this.cameraOffset[0] = 4 * Math.sin(speed * performance.now() / 1000)
            this.cameraOffset[2] = 4 * Math.cos(speed * performance.now() / 1000)
        }, 10)
    }
    public update(): void {
        if(this.context.frame == 1) this.cube.place(4, 6)
        if(this.context.frame == 1){
            this.cube.installModule(this.cube.state.side, 0, CubeModule.Auger)
            window['quat'] = quat
            //window['app'].systems[17].cameraOffset=[2,6,3]//[4,4,3]//[-4,5,-5]//[-4,8,3]//
        }
        this.tilemap.renderFaceTiles(this.cube)

        this.cube.meshes[this.cube.state.side].armature.frame = 0
        window['a'] = this.cube.meshes[this.cube.state.side].armature
        
        vec3.copy(this.cube.transform.position, this.cameraTarget)
        this.adjustCamera(this.cameraTarget)
    }
    private adjustCamera(target: vec3){
        const camera = this.context.get(CameraSystem).camera
        
        vec3.add(this.cameraOffset, target, this.cameraPivot)
        vec3.lerp(camera.transform.position, this.cameraPivot, this.cameraSmoothness, camera.transform.position)

        const dx = camera.transform.position[0] - target[0]
        const dy = camera.transform.position[1] - target[1]
        const dz = camera.transform.position[2] - target[2]
        const dw = Math.sqrt(dx*dx+dz*dz)
        
        quat.axisAngle(vec3.AXIS_Y, Math.atan2(dx, dz), this.cameraYaw)
        quat.axisAngle(vec3.AXIS_X, Math.atan2(-dy, dw), this.cameraPitch)
        quat.multiply(this.cameraYaw, this.cameraPitch, camera.transform.rotation)
        quat.normalize(camera.transform.rotation, camera.transform.rotation)
        camera.transform.frame = 0
    }
    load(){
        this.context.get(SharedSystem).grid.decal.transform.parent = this.cube.transform
        const models = this.context.get(MeshSystem).models
        const cubeMaterials: MeshMaterial[] = []
        for(let key in models){
            if(!models[key].material) continue
            models[key].material.array = SharedSystem.textures.indexedTexture.array
            models[key].material.arrayLayers = SharedSystem.textures.indexedTexture.arrayLayers
            if(key.indexOf('cube') != -1) cubeMaterials[models[key].material.index] = models[key].material
        }
        this.tilemap.extractTileMap(cubeMaterials.filter(Boolean), 512/8, 8)
    }
}