import { Application } from './engine/framework'

import { TransformSystem, CameraSystem, AnimationSystem } from './engine/scene'
import { MaterialSystem } from './engine/materials/Material'
import { MeshSystem } from './engine/components/Mesh'
import { SpriteSystem } from './engine/components/Sprite2D'
import { KeyboardSystem } from './engine/device'
import {
    DeferredGeometryPass,
    DecalPass,
    AmbientLightPass,
    PointLightPass,
    ParticleEffectPass,
    PostEffectPass,
    OverlayPass
} from './engine/pipeline'

import { DebugSystem } from './engine/debug'

import { SharedSystem, TurnBasedSystem, TerrainSystem, PlayerSystem, AISystem } from './world'
import manifest from './manifest.json'

new Application([
    KeyboardSystem,
    AnimationSystem,
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