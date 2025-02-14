import { renderManager } from '../RenderManager'
import { Widget } from '../Widget'
import { RenderElement, RenderElements, Style } from '../util/RenderElement'
import { ToolbarView } from './ToolbarView'

export class ToolbarWidget extends Widget {
	public readonly id: string
	private readonly views: ToolbarView[] = []
	private readonly hideHeader: boolean
	private selectedView: ToolbarView|undefined
	private beingRendered: boolean = false

	public constructor(id: string, options?: {hideHeader?: boolean}) {
		super()
		this.id = id
		this.hideHeader = options?.hideHeader ?? false
	}

	public getId(): string {
		return this.id
	}

	public async addView(view: ToolbarView): Promise<void> {
		this.views.push(view)

		if (!this.selectedView) {
			this.selectedView = this.views[0]
		}

		if (this.beingRendered) {
			await renderManager.setElementsTo(this.getId(), this.shapeInner())
		}
	}

	public async render(): Promise<void> {
		if (this.beingRendered) {
			return
		}
		this.beingRendered = true

		await renderManager.setElementsTo(this.getId(), this.shapeInner())
	}

	public async unrender(): Promise<void> {
		if (!this.beingRendered) {
			return
		}
		this.beingRendered = false
		
		if (this.selectedView) {
			await this.selectedView.getWidget().unrender()
		}
		await renderManager.setContentTo(this.getId(), '')
	}

	public shapeOuter(additionalStyle?: Style): RenderElement {
		return {
			type: 'div',
			id: this.id,
			style: additionalStyle
		}
	}

	private shapeInner(): RenderElements {
		const elements: RenderElements = this.hideHeader
			? []
			: this.shapeHeader()

		if (this.views.length === 0) {
			elements.push('no ToolbarViews added')
			return elements
		} else if (!this.selectedView) {
			elements.push('no ToolbarView selected')
			return elements
		}
		elements.push(this.selectedView.getWidget().shape().element)
		return elements
	}

	private shapeHeader(): RenderElement[] {
		const elements: RenderElement[] = []

		for (const view of this.views) {
			const selected: boolean = view === this.selectedView
			elements.push({
				type: 'span',
				style: {fontWeight: selected ? 'bold' : undefined},
				children: view.getName()
			})
		}

		return elements
	}

}
