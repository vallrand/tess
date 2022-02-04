import { Scarab } from './Scarab'
import { Tarantula, TarantulaVariant } from './Tarantula'
import { Stingray } from './Stingray'
import { Locust } from './Locust'
import { Obelisk } from './Obelisk'
import { Monolith } from './Monolith'
import { Decapod } from './Decapod'
import { Isopod } from './Isopod'

export const enum UnitType {
    Scarab = 0,
    Tarantula = 1,
    Stingray = 2,
    Locust = 3,
    Obelisk = 4,
    Monolith = 5,
    Decapod = 6,
    Isopod = 7,
    TarantulaVariant = 8
}

export const UnitFactory = {
    [UnitType.Scarab]: Scarab,
    [UnitType.Tarantula]: Tarantula,
    [UnitType.Stingray]: Stingray,
    [UnitType.Locust]: Locust,
    [UnitType.Obelisk]: Obelisk,
    [UnitType.Monolith]: Monolith,
    [UnitType.Decapod]: Decapod,
    [UnitType.Isopod]: Isopod,
    [UnitType.TarantulaVariant]: TarantulaVariant
}