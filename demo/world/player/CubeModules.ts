import { Application } from '../../engine/framework'
import { ActionSignal } from '../Actor'
import { Cube } from './Cube'

export const enum CubeModule {
    Empty = 0,
    Death = 1,
    Machinegun = 2,
    Railgun = 3,
    Repair = 4,
    EMP = 5,
    Voidgun = 6,
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
        model: 'cube_1'
    },
    [CubeModule.Repair]: {
        model: 'cube_2'
    },
    [CubeModule.EMP]: {
        model: 'cube_3'
    },
    [CubeModule.Voidgun]: {
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