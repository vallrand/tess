import { Application } from '../../engine/framework'
import { mat4, quat } from '../../engine/math'
import { ActionSignal } from '../Actor'
import { Cube } from '../player'

export class ShieldSkill {
    constructor(private readonly context: Application, private readonly cube: Cube){

    }
    public *activate(transform: mat4, orientation: quat): Generator<ActionSignal> {

    }
}