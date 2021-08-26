import { Application } from './engine/framework'

import { TransformSystem } from './engine/Transform'
import { CameraSystem } from './engine/Camera'
import { MaterialSystem } from './engine/Material'
import { MeshSystem } from './engine/Mesh'
import { SpriteSystem } from './engine/Sprite'
import { KeyboardSystem } from './engine/Keyboard'
import { DeferredGeometryPass } from './engine/deferred/GeometryPass'
import { DecalPass } from './engine/deferred/DecalPass'
import { PointLightPass } from './engine/deferred/PointLightPass'
import { AmbientLightPass } from './engine/deferred/AmbientLightPass'
import { ParticleEffectPass } from './engine/deferred/ParticleEffectPass'
import { PostEffectPass } from './engine/deferred/PostEffectPass'
import { OverlayPass } from './engine/deferred/OverlayPass'

import { DebugSystem } from './engine/Debug'

import { SharedSystem, TurnBasedSystem, TerrainSystem, PlayerSystem, AISystem } from './world'
import manifest from './manifest.json'

new Application([
    KeyboardSystem,
    TransformSystem,
    CameraSystem,
    MaterialSystem,
    MeshSystem,
    SpriteSystem,

    DeferredGeometryPass,
    DecalPass,
    AmbientLightPass,
    PointLightPass,
    ParticleEffectPass,
    PostEffectPass,
    OverlayPass,

    SharedSystem,
    TurnBasedSystem,
    TerrainSystem,
    PlayerSystem,
    AISystem,

    DebugSystem
])
.load(manifest)