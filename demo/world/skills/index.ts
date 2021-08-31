import { Application } from '../../engine/framework'
import { Cube, CubeModule } from '../player'

import { BeamSkill } from './BeamSkill'
import { ShockwaveSkill } from './ShockwaveSkill'
import { ShieldSkill } from './ShieldSkill'
import { ProjectileSkill } from './ProjectileSkill'

export const CubeSkills = (context: Application, cube: Cube) => ({
    [CubeModule.Railgun]: new BeamSkill(context, cube),
    [CubeModule.EMP]: new ShockwaveSkill(context, cube),
    [CubeModule.Shield]: new ShieldSkill(context, cube),
    [CubeModule.Machinegun]: new ProjectileSkill(context, cube)
})