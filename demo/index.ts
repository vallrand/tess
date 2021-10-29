// import { Application } from './engine/framework'

// import { TransformSystem } from './engine/scene/Transform'
// import { CameraSystem } from './engine/scene/Camera'
// import { AnimationSystem } from './engine/animation/Animation'
// import { MaterialSystem } from './engine/materials/Material'
// import { MeshSystem } from './engine/components/Mesh'
// import { KeyboardSystem } from './engine/device'
// import {
//     DeferredGeometryPass,
//     DecalPass,
//     AmbientLightPass,
//     PointLightPass,
//     ParticleEffectPass,
//     PostEffectPass,
//     OverlayPass
// } from './engine/pipeline'

// import { DebugSystem } from './engine/debug'

// import { SharedSystem, TurnBasedSystem, TerrainSystem, EconomySystem, PlayerSystem, AISystem } from './world'
// import manifest from './manifest.json'

// new Application([
//     KeyboardSystem,
//     AnimationSystem,
//     TransformSystem,
//     CameraSystem,
//     MaterialSystem,
//     MeshSystem,

//     DeferredGeometryPass,
//     DecalPass,
//     AmbientLightPass,
//     PointLightPass,
//     ParticleEffectPass,
//     PostEffectPass,
//     OverlayPass,

//     SharedSystem,
//     TurnBasedSystem,
//     TerrainSystem,
//     EconomySystem,
//     PlayerSystem,
//     AISystem,

//     DebugSystem
// ])
// .load(manifest)

import { TileSetMapGenerator, TextureMapGenerator } from './world/terrain/WaveFunctionCollapse'
import { random } from './engine/math'

const WHITE = 0xFFFFFFFF
const BLACK = 0xFF000000
const RED = 0xFF0000FF
const GREEN = 0xFF00FF00
const BLUE = 0xFFFF0000


const image = new ImageData(new Uint8ClampedArray(new Uint32Array([
    WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,
    WHITE,GREEN,GREEN,GREEN,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,
    WHITE,GREEN,RED,  GREEN,WHITE,WHITE,WHITE,BLACK,BLACK,BLACK,BLACK,GREEN,BLACK,BLACK,BLACK,WHITE,
    WHITE,GREEN,GREEN,GREEN,WHITE,WHITE,WHITE,BLACK,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,WHITE,
    WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,GREEN,WHITE,
    WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,BLACK,BLACK,GREEN,BLACK,BLACK,BLACK,WHITE,WHITE,BLACK,GREEN,
    WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,WHITE,WHITE,WHITE,GREEN,
    WHITE,WHITE,BLACK,WHITE,WHITE,GREEN,WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,WHITE,WHITE,WHITE,GREEN,
    WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,WHITE,WHITE,GREEN,BLACK,BLACK,BLACK,BLACK,GREEN,BLACK,BLACK,
    WHITE,BLACK,BLACK,GREEN,BLACK,BLACK,WHITE,WHITE,GREEN,WHITE,WHITE,BLACK,WHITE,WHITE,BLACK,WHITE,
    WHITE,BLACK,WHITE,WHITE,WHITE,BLACK,BLACK,BLACK,BLACK,WHITE,WHITE,BLACK,WHITE,WHITE,BLACK,WHITE,
    WHITE,BLACK,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,WHITE,WHITE,GREEN,WHITE,WHITE,BLACK,WHITE,
    WHITE,GREEN,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,BLACK,BLACK,GREEN,GREEN,BLACK,BLACK,WHITE,
    WHITE,BLACK,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,
    WHITE,BLACK,BLACK,BLACK,GREEN,GREEN,BLACK,BLACK,BLACK,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,
    WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,WHITE,BLACK,WHITE,WHITE,WHITE,WHITE,WHITE
]).buffer), 16, 16)

function canvas(image: ImageData){
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    canvas.style.imageRendering = 'pixelated'
    canvas.getContext('2d').putImageData(image, 0, 0)
    document.body.appendChild(canvas)
    return canvas
}

Object.assign(canvas(image).style, { width: '100px', height: '100px' })
document.querySelector('.overlay')['style'].display='none'

let modelA = new TextureMapGenerator(3, 20, 20, false, image, true, 8)
// for(let x = 0; x < 20; x++) modelA.set(x, 19, 0xFFFFFFFF)
// for(let x = 0; x < 20; x++) modelA.set(x, 10, 0xFF000000)

if(!modelA.generate(random, -1)) throw 'FAILED'
const result = modelA.graphics()
console.log(window['m'] = modelA, result)

Object.assign(canvas(result).style, { width: '100%' })

const images = Promise.all([
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAM0lEQVQImWOccUQ0495lBiQwQ0mX8f9JPgYMwPj/E6YgAxMWMVyiLAzXsZjLMvM3O6YbAL+hDchoiFysAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAFElEQVQImWOccUSUAQMwYQrRXRQA4GsBf+NZCRoAAAAASUVORK5CYII=',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAG0lEQVQImWOccUQ0495lBiQwQ0mXiQEboK8oAJIABH/orAscAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAL0lEQVQImWOccUQ0495lBiQwQ0mXiQEDZNy7jEWUgYEBt+gMJV3satEkWJCthrMB33UJTxrFxY8AAAAASUVORK5CYII=',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAJElEQVQImWOccUSUgYEhXe81AwMDAwPDzEuiDAwMTAzYAH1FAYkJBH9MGQTZAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAM0lEQVQImWOccUSUgYEhXe81AwMDAwPDzEuiDAwMTAzYAAsaH6IJu1omZOOwmIAsgd0EAJ7QCQOm1vQdAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAALklEQVQImWOccUSUAQMwYQoxMDAw/v+ERRS7WuyiLDMviTIwMKTrvYbwIVzsagFRIgfx3PGauAAAAABJRU5ErkJggg==',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAJ0lEQVQImWNgYGBgYGCor6+HkwwMDIzIHAhobGxkRBOilloGrG4AAHP2EfRKAuMzAAAAAElFTkSuQmCC',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAANUlEQVQImWOccUQ0w+Z1fX09AwMDAwNDY2PjjCOijDOOiD7fncWABCRdpzFB5OFCEDat1AIAWiQd4Xc2GiMAAAAASUVORK5CYII=',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAARklEQVQImWOccUT0+e4sBiQg6TqNkWHRC4Y4ifr6eohQY2Mjw6IXTAzYACPDohf1d6cjCzUqZzJBdcGFGhsZGBhwmIDVDQD5FxcHuCuhbwAAAABJRU5ErkJggg==',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAR0lEQVQImWOccUQ0w+Z1fX09AwMDAwNDY2PjjCOijDOOiD7fncWABCRdpzH+/8TAyMeArPb/JwYmBmwAuyh2c5kgZsGFIGwAzicaVbj/psYAAAAASUVORK5CYII='
].map(src => new Promise<ImageData>(resolve => {
    const image = new Image()
    image.src = src
    image.onload = function(){
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        ctx.drawImage(image, 0, 0)
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
})))

const names = [
    'bridge', 'ground', 'river', 'riverturn', 'road', 'roadturn', 't', 'tower', 'wall', 'wallriver', 'wallroad'
]

let modelB = new TileSetMapGenerator({
    weight: [1,1,1,1,1,1,1],
    symmetry: ['I', 'X', 'I', 'L', 'I', 'L', 'T'],
    constraints: [
        [0, 1, 2, 1],
        [0, 1, 3, 1],
        [0, 0, 4, 1],
        [0, 0, 5, 1],
        [0, 0, 6, 0],
        [0, 0, 6, 3],
        // [0, 0, 10, 0],
        [1, 0, 1, 0],
        [1, 0, 2, 0],
        [1, 0, 3, 0],
        [1, 0, 4, 0],
        [1, 0, 5, 0],
        [1, 0, 6, 1],
        // [1, 0, 7, 0],
        // [1, 0, 8, 0],
        [2, 1, 2, 1],
        [2, 1, 3, 1],
        [2, 0, 4, 0],
        [2, 0, 5, 0],
        [2, 0, 6, 1],
        // [2, 0, 7, 0],
        // [2, 0, 8, 0],
        // [2, 1, 9, 0],
        [3, 0, 3, 2],
        [4, 0, 3, 0],
        [5, 1, 3, 0],
        [5, 2, 3, 0],
        [6, 3, 3, 0],
        // [7, 1, 3, 0],
        // [7, 2, 3, 0],
        // [8, 0, 3, 0],
        // [3, 0, 9, 0],
        [4, 1, 4, 1],
        [5, 0, 4, 1],
        [4, 1, 6, 0],
        [4, 1, 6, 3],
        // [4, 0, 7, 0],
        // [4, 0, 8, 0],
        // [4, 1, 10, 0],
        [5, 0, 5, 2],
        [5, 0, 6, 0],
        // [5, 1, 7, 0],
        // [5, 2, 7, 0],
        // [5, 1, 8, 0],
        // [5, 0, 10 ,0],
        [6, 0, 6, 2],
        // [6, 3, 7, 0],
        // [6, 3, 8, 0],
        // [6, 0, 10, 0],
        // [6, 1, 10, 0],
        // [7, 0, 8, 1],
        // [7, 0, 9, 1],
        // [7, 0, 10, 1],
        // [8, 1, 8, 1],
        // [8, 1, 9, 1],
        // [8, 1, 10, 1],
        // [9, 1, 10, 1]
    ]
}, 20, 20, false)

if(!modelB.generate(random, -1)) throw 'FAILED B'
images.then(images => {
    const resultB = modelB.graphics(images)
    console.log(window['mb'] = modelB, resultB)
    Object.assign(canvas(resultB).style, { width: '100%' })
})