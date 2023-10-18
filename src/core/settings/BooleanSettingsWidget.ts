import { BooleanSetting, settings } from '../Settings';
import { RenderElement } from '../util/RenderElement';

export class BooleanSettingsWidget /*extends ?Widget TODO*/ {

	public constructor(
		public readonly id: string,
		public readonly settingName: BooleanSetting
	) {}

	public shape(): RenderElement {
		return {
			type: 'tr',
			children: [
				{
					type: 'td',
					innerHTML: `<label for="${this.id+'-input'}">${this.settingName}: </label>`
				},
				{
					type: 'td',
					onchangeChecked: (checked: boolean) => settings.setBoolean(this.settingName, checked), // works because bubbles from 'input' field to 'td'
					innerHTML: `<input id="${this.id+'-input'}" type="checkbox" ${settings.getBoolean(this.settingName) ? 'checked' : ''}>`
				}
			]
		}
	}
	
}