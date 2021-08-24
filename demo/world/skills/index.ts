import { Application } from '../../engine/framework'
import { Cube, CubeModule } from '../player'

import { BeamSkill } from './BeamSkill'

export const CubeSkills = (context: Application, cube: Cube) => ({
    [CubeModule.Railgun]: new BeamSkill(context, cube)
})