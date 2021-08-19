import { Application } from '../../engine/framework'
import { ActionSignal } from '../Actor'
import { Cube } from './Cube'

export const enum CubeModule {
    Empty = 0,
    Death = 1,
    Machinegun = 2,
    Railgun = 3,
    EMP = 4,
    Voidgun = 5,
    Repair = 6,
    Minelayer = 7,
    Auger = 8,
    Shield = 9,
    Missile = 10,
    Max = 11
}

export const cubeModules: Record<CubeModule, {
    model?: string
    activate?: () => Generator<ActionSignal>
}> = {
    [CubeModule.Empty]: {
        model: 'cube_open'
    },
    [CubeModule.Death]: {
        model: 'death'
    },
    [CubeModule.Machinegun]: {
        model: 'cube_0'
    },
    [CubeModule.Railgun]: {
        model: 'cube_1',
        activate(this: Cube): Generator<ActionSignal> {
            return
        }
    },
    [CubeModule.EMP]: {
        model: 'cube_2'
    },
    [CubeModule.Voidgun]: {
        model: 'cube_3'
    },
    [CubeModule.Repair]: {
        model: 'cube_4'
    },
    [CubeModule.Minelayer]: {
        model: 'cube_5'
    },
    [CubeModule.Auger]: {
        model: 'cube_6'
    },
    [CubeModule.Shield]: {
        model: 'cube_7'
    },
    [CubeModule.Missile]: {
        model: 'cube_8'
    },
    [CubeModule.Max]: null
}