import { Application } from '../../engine/framework'

import { Scarab } from './scarab/Scarab'
import { Tarantula, TarantulaVariant } from './tarantula/Tarantula'
import { Stingray } from './stingray/Stingray'
import { Locust } from './locust/Locust'
import { Obelisk } from './obelisk/Obelisk'
import { Monolith } from './monolith/Monolith'
import { Decapod } from './decapod/Decapod'
import { Isopod } from './isopod/Isopod'

export const UnitFactory = (context: Application) => ({
    0: Scarab,
    1: Tarantula,
    2: Stingray,
    3: Locust,
    4: Obelisk,
    5: Monolith,
    6: Decapod,
    7: Isopod,
    8: TarantulaVariant
})