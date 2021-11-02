import { Application } from '../../engine/framework'

import { Scarab } from './Scarab'
import { Tarantula, TarantulaVariant } from './Tarantula'
import { Stingray } from './Stingray'
import { Locust } from './Locust'
import { Obelisk } from './Obelisk'
import { Monolith } from './Monolith'
import { Decapod } from './Decapod'
import { Isopod } from './Isopod'

export const UnitFactory = {
    0: Scarab,
    1: Tarantula,
    2: Stingray,
    3: Locust,
    4: Obelisk,
    5: Monolith,
    6: Decapod,
    7: Isopod,
    8: TarantulaVariant
}