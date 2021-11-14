import { Application } from '../../engine/framework'
import { OverlayPass, ParticleEffectPass } from '../../engine/pipeline'
import { SpriteMaterial, VectorGraphicsTexture } from '../../engine/materials'
import { CubeModule } from '../player'

export function IconLibrary(context: Application){
    const vectorAtlas = new VectorGraphicsTexture(context.gl, 512, 512)
    const iconColor = 'rgba(155,207,197,0.8)'

    const moduleIcons: Partial<Record<CubeModule, SpriteMaterial>> = {
        [CubeModule.Empty]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' }
        ]),
        [CubeModule.Machinegun]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' },
            { line: { width: 4 }, color: iconColor, path: 'M 0 16 H 32 M 16 0 V 32' }
        ]),
        [CubeModule.Railgun]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' },
            { line: { width: 4 }, color: iconColor, path: 'M 16 0 V 32' }
        ]),
        [CubeModule.Repair]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' },
            { line: { width: 4 }, color: iconColor, path: 'M 8 16 H 24 M 16 8 V 24' }
        ]),
        [CubeModule.Voidgun]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' },
            { line: { width: 4 }, color: iconColor, path: 'M 0 16 H 32 M 16 0 V 16' }
        ]),
        [CubeModule.Minelayer]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' },
            { line: { width: 4 }, color: iconColor, path: 'M 0 16 H 8 M 32 16 H 24 M 16 0 V 8 M 16 32 V 24 M 8 8 H 24 V 24 H 8 Z' }
        ]),
        [CubeModule.Auger]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' },
            { line: { width: 4 }, color: iconColor, path: 'M 10 10 H 22 V 22 H 10 Z' }
        ]),
        [CubeModule.Missile]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' },
            { line: { width: 4 }, color: iconColor, path: 'M 16 0 V 8 M 16 32 V 24 M 16 24 L 8 20 V 12 L 16 8 L 24 12 V 20 Z' }
        ]),
        [CubeModule.EMP]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' },
            { line: { width: 4 }, color: iconColor, path: 'M 12 8 H 20 L 24 12 V 20 L 20 24 H 12 L 8 20 V 12 Z' }
        ]),
        [CubeModule.Shield]: vectorAtlas.render(32, 32, [
            { line: { width: 4 }, color: iconColor, path: 'M 0 0 H 32 V 32 H 0 Z' },
            { line: { width: 4 }, color: iconColor, path: 'M 12 16 A 4 4 0 1 1 20 16 A 4 4 0 1 1 12 16' }
        ])
    }

    const icons = {
        slot: vectorAtlas.render(32, 32, [
            { color: 'rgba(34,34,34,0.5)', path: 'M 4 4 H 28 V 28 H 4 Z' },
            { line: { width: 2 }, color: 'rgba(75,77,67,1)', path: 'M 4 4 H 28 V 28 H 4 Z' },
        ]),
        filled: vectorAtlas.render(32, 32, [
            { color: 'rgba(74,74,74,0.5)', path: 'M 4 4 H 28 V 28 H 4 Z' },
            { line: { width: 2 }, color: 'rgba(162,171,108,1)', path: 'M 4 4 H 28 V 28 H 4 Z' },
            { shadow: { x: 0, y: 0, blur: 4, color: '#a2ab6c' }, color: 'rgba(162,171,108,1)', path: 'M 10 10 H 22 V 22 H 10 Z' },
        ]),
        glow: vectorAtlas.render(32, 32, [
            { shadow: { x: 0, y: 0, blur: 4, color: '#dce0bf' }, color: '#dce0bf', path: 'M 4 4 H 28 V 28 H 4 Z' }
        ]),
        armor: vectorAtlas.render(32, 32, [
            { line: { width: 2 }, color: 'rgba(48,79,96,1)', path: 'M 2 2 H 30 V 30 H 2 Z' },
            { color: 'rgba(48,79,96,1)', path: 'M 6 6 H 26 L 24 20 L 16 26 L 8 20 Z' },
            { line: { width: 2 }, color: 'rgba(48,79,96,1)', path: 'M 16 8 V 22 M 10 15 H 22' },
        ]),
        storage: vectorAtlas.render(32, 32, [
            { line: { width: 2 }, color: 'rgba(188,186,142,1)', path: 'M 2 2 H 30 V 30 H 2 Z' },
            { color: 'rgba(188,186,142,1)', path: [
                'M 17 17 H 28 V 28 H 17 Z',
                'M 4 17 H 15 V 28 H 4 Z',
                'M 10 15 H 22 V 4 H 10 Z'
            ].join(' ') },
        ]),
        rate: vectorAtlas.render(32, 32, [
            { line: { width: 2 }, color: 'rgba(206,122,28,1)', path: 'M 2 2 H 30 V 30 H 2 Z' },
            { color: 'rgba(206,122,28,1)', path: [
                'M 4 14 V 18 H 20 V 14 Z',
                'M 4 6 V 10 H 20 V 6 Z',
                'M 4 22 V 26 H 20 V 22 Z',
                'M 21 14 V 18 L 30 16 Z',
                'M 21 6 V 10 L 30 8 Z',
                'M 21 22 V 26 L 30 24 Z'
            ].join(' ') }
        ]),
        efficacy: vectorAtlas.render(32, 32, [
            { line: { width: 2 }, color: 'rgba(135,15,73,1)', path: 'M 2 2 H 30 V 30 H 2 Z' },
            { color: 'rgba(135,15,73,1)', path: [
                'M 10 16 A 6 6 0 1 1 22 16 A 6 6 0 1 1 10 16',
                'M 4 4 H 12 V 8 H 8 V 12 H 4 Z',
                'M 28 4 H 20 V 8 H 24 V 12 H 28 Z',
                'M 28 28 H 20 V 24 H 24 V 20 H 28 Z',
                'M 4 28 H 12 V 24 H 8 V 20 H 4 Z',
            ].join(' ') },
        ]),
        range: vectorAtlas.render(32, 32, [
            { line: { width: 2 }, color: 'rgba(15,109,91,1)', path: 'M 2 2 H 30 V 30 H 2 Z' },
            { line: { width: 2 }, color: 'rgba(15,109,91,1)', path: [
                'M 4 16 A 12 12 0 1 1 28 16 A 12 12 0 1 1 4 16',
                'M 8 16 A 8 8 0 1 1 24 16 A 8 8 0 1 1 8 16',
            ].join(' ') },
        ])
    }
    vectorAtlas.update()
    for(let key in icons) icons[key].program = context.get(OverlayPass).program
    for(let key in moduleIcons) moduleIcons[key].program = context.get(ParticleEffectPass).program
    return { moduleIcons, ...icons }
}