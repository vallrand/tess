import { Application } from '../../engine/framework'
import { Cube, CubeModule } from '../player'

import { CubeSkill } from './CubeSkill'
import { BeamSkill } from './BeamSkill'
import { ShockwaveSkill } from './ShockwaveSkill'
import { ShieldSkill } from './ShieldSkill'
import { ProjectileSkill } from './ProjectileSkill'
import { DetonateSkill } from './DetonateSkill'
import { OrbSkill } from './OrbSkill'
import { ArtillerySkill } from './ArtillerySkill'
import { RestoreSkill } from './RestoreSkill'
import { ExtractSkill } from './ExtractSkill'

export const CubeSkills = (context: Application, cube: Cube) => ({
    [CubeModule.Empty]: new CubeSkill(context, cube),
    [CubeModule.Railgun]: new BeamSkill(context, cube),
    [CubeModule.EMP]: new ShockwaveSkill(context, cube),
    [CubeModule.Shield]: new ShieldSkill(context, cube),
    [CubeModule.Machinegun]: new ProjectileSkill(context, cube),
    [CubeModule.Minelayer]: new DetonateSkill(context, cube),
    [CubeModule.Voidgun]: new OrbSkill(context, cube),
    [CubeModule.Missile]: new ArtillerySkill(context, cube),
    [CubeModule.Repair]: new RestoreSkill(context, cube),
    [CubeModule.Auger]: new ExtractSkill(context, cube)
})