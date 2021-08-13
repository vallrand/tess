import { clamp, lerp, vec2, vec3, vec4, mat4, quat, ease, aabb2, mat3x2 } from '../../engine/math'
import { Application, System, IProgressHandler } from '../../engine/framework'
import { CameraSystem } from '../../engine/Camera'
import { MaterialSystem, Material } from '../../engine/Material'
import { Cube } from './Cube'
import { DebugSystem } from '../../engine/Debug'
import { CubeTileMap } from './CubeTileMap'
import { Transform, TransformSystem } from '../../engine/Transform'
import { DecalPass } from '../../engine/deferred/DecalPass'
import { ParticleEffectPass } from '../../engine/deferred/ParticleEffectPass'
import { ShieldEffect, GridEffect, EffectLibrary } from '../effects'

export class PlayerSystem implements System {
    public readonly cameraTarget: vec3 = vec3(0,0,0)
    public readonly cameraOffset: vec3 = vec3(0, 8, 4)
    private readonly cameraPivot: vec3 = vec3(0,0,0)
    private readonly cameraYaw: quat = quat()
    private readonly cameraPitch: quat = quat()
    private readonly cameraSmoothness: number = 0.1

    public readonly cube: Cube = new Cube(this.context)
    public readonly tilemap: CubeTileMap = new CubeTileMap(this.context)
    public readonly grid: GridEffect
    public readonly shield: ShieldEffect
    public readonly effects: EffectLibrary = new EffectLibrary(this.context)

    constructor(private readonly context: Application){
        this.grid = new GridEffect(this.context, 10)
        this.grid.transform.parent = this.cube.transform
        this.context.get(DecalPass).effects.push(this.grid)

        this.shield = new ShieldEffect(this.context)
        this.context.get(ParticleEffectPass).effects.push(this.shield)
    }
    public update(): void {
        if(this.context.frame == 1) this.cube.place(4, 6)
        if(this.context.frame == 1) this.cube.installModule(this.cube.state.side, 0, 9)
        this.tilemap.renderFaceTiles(this.cube)

        this.cube.meshes[this.cube.state.side].armature.frame = 0
        window['a'] = this.cube.meshes[this.cube.state.side].armature
        window['quat'] = quat
        
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
    load(manifest: { texture: string[] }, progress: IProgressHandler<void>){
        const materials = this.context.get(MaterialSystem)
        const layers = [
            { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0,0,0,0.5] }},
            { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0.91, 0.23, 0.52, 1] }}, 
            { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0.69, 0.71, 0.73, 0] }}, 
            { shader: require('../shaders/circuit_frag.glsl'), rate: 2, uniforms: {  }}, 
            { shader: require('../shaders/hatch_frag.glsl'), rate: 0, uniforms: { uColor: [0.8,0.9,1.0] }}, 
            { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0.46, 0.61, 0.7, 0.5] }}, 
            { shader: require('../shaders/wires_frag.glsl'), rate: 2, uniforms: {  }}, 
            { shader: require('../shaders/rust_frag.glsl'), rate: 0, uniforms: {  }}, 
            { shader: require('../shaders/solid_frag.glsl'), rate: 0, uniforms: { uColor: [0.46, 0.6, 0.62, 0.5] }}
        ]

        const textureArray = materials.createRenderTexture(MaterialSystem.textureSize, MaterialSystem.textureSize, layers.length)
        for(let index = 0; index < layers.length; index++)
        materials.addRenderTexture(
            textureArray, index,
            materials.fullscreenShader(layers[index].shader),
            layers[index].uniforms, layers[index].rate
        )
        
        const cubeMaterials: Material[] = []
        const cubeTilemap = this.tilemap
        for(let key in materials.materials){
            materials.materials[key].array = textureArray.target
            materials.materials[key].arrayLayers = layers.length
            if(manifest.texture[key].indexOf('cube') != -1) cubeMaterials.push(materials.materials[key]) 
        }
        let remaining = cubeMaterials.length
        materials.materialLoad.addListener(function handleMaterial(material: Material){
            const index = cubeMaterials.indexOf(material)
            if(index == -1) return
            if(--remaining > 0) return
            materials.materialLoad.removeListener(handleMaterial)
            cubeTilemap.extractTileMap(cubeMaterials, 512/8, 8)
        })
    }
}