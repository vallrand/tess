import { Application } from '../framework'
import { DomNode, IDebugHelper } from './DebugHelper'
import { SharedSystem } from '../../world/shared'
import { AmbientLightPass, OverlayPass, PostEffectPass } from '../pipeline'
import { MaterialSystem } from '../materials'

const Toggle = (label: string, target: { enabled: boolean }): HTMLElement => 
DomNode('div', {
    innerText: label, style: { display: 'flex', width: '100%' }
}, [DomNode('input', {
    type: 'checkbox', checked: target.enabled, style: { pointerEvents: 'all', marginLeft: 'auto' }
}, null, {
    change: event => target.enabled = (event.target as HTMLInputElement).checked
})])

export class SettingsHelper implements IDebugHelper {
    constructor(private readonly context: Application){}
    public update(): void {}
    public open(): HTMLElement {
        return DomNode('div', {
            style: { display: 'flex', flexDirection: 'column' }
        }, [
            DomNode('div', {
                innerText: 'settings', style: { textTransform: 'uppercase', display: 'flex', borderBottom: '1px solid #efefef' }
            }),
            Toggle('sky', this.context.get(SharedSystem).sky),
            Toggle('grid', this.context.get(SharedSystem).grid),
            Toggle('mist', this.context.get(SharedSystem).mist),
            Toggle('fog', this.context.get(PostEffectPass).fog),
            Toggle('bloom', this.context.get(PostEffectPass).bloom),
            Toggle('textures', this.context.get(MaterialSystem)),
            Toggle('reflection', this.context.get(AmbientLightPass).reflection),
            Toggle('ui', this.context.get(OverlayPass))
        ])
    }
}