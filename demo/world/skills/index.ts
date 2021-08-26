import { Application } from '../../engine/framework'
import { Cube, CubeModule } from '../player'

import { BeamSkill } from './BeamSkill'
import { ShockwaveSkill } from './ShockwaveSkill'
//missileSKill projectileSkill?    place

export const CubeSkills = (context: Application, cube: Cube) => ({
    [CubeModule.Railgun]: new BeamSkill(context, cube),
    [CubeModule.EMP]: new ShockwaveSkill(context, cube)
})