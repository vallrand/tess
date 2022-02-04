import { Application } from './engine/framework'

import { TransformSystem } from './engine/scene/Transform'
import { CameraSystem } from './engine/scene/Camera'
import { AudioSystem } from './engine/audio/Audio'
import { AnimationSystem } from './engine/animation/Animation'
import { MaterialSystem } from './engine/materials/Material'
import { MeshSystem } from './engine/components/Mesh'
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

import { SharedSystem, TurnBasedSystem, TerrainSystem, EconomySystem, PlayerSystem, AISystem } from './world'
import manifest from './manifest.json'

new Application([
    KeyboardSystem,
    AnimationSystem,
    TransformSystem,
    CameraSystem,
    AudioSystem,
    MaterialSystem,
    MeshSystem,

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
    EconomySystem,
    PlayerSystem,
    AISystem,

    DebugSystem
])
.load(manifest)