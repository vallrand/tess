import { Application } from '../framework'
import { DomNode, IDebugHelper } from './DebugHelper'
import { SharedSystem } from '../../world/shared'
import { AmbientLightPass, OverlayPass, PostEffectPass } from '../pipeline'
import { MaterialSystem } from '../materials'
import { AudioSystem } from '../audio'

const Toggle = (label: string, target: { enabled: boolean }): HTMLElement => 
DomNode('div', {
    innerText: label, style: { display: 'flex', width: '100%' }
}, [DomNode('input', {
    type: 'checkbox', checked: target.enabled, style: { pointerEvents: 'all', marginLeft: 'auto' }
}, null, {
    change: event => target.enabled = (event.target as HTMLInputElement).checked
})])

const Slider = (label: string, target: { value: number }): HTMLElement =>
DomNode('div', {
    innerText: label, style: { display: 'flex', width: '100%' }
},[DomNode('input', {
    type: 'range', min: 0, max: 100, step: 1, value: 50, style: { pointerEvents: 'all', marginLeft: 'auto' }
}, null, {
    change: event => target.value = +(event.target as HTMLInputElement).value / 100
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
            Toggle('ui', this.context.get(OverlayPass)),
            Slider('music', (this.context.get(AudioSystem) as any).mixer.channel.music.gain.gain),
            Slider('sfx', (this.context.get(AudioSystem) as any).mixer.channel.sfx.gain.gain)
        ])
    }
}