import { renderManager } from '../RenderManager'
import { settings } from '../Settings'
import { Rect } from '../Rect'
import { Box } from './Box'
import * as util from '../util'

export abstract class BoxBody {
  private readonly referenceBox: Box
  private rendered: boolean = false
  private renderInProgress = false
  private rerenderAfterRenderFinished = false
  private unrenderAfterRenderFinished = false

  public constructor(referenceBox: Box) {
    this.referenceBox = referenceBox
  }

  public isRendered(): boolean {
    return this.rendered
  }

  public getId(): string {
    return this.referenceBox.getId()+'body'
  }

  public async render(): Promise<void> { // TODO: make sure only one thread is in this method (semaphore)
    if (this.renderInProgress) {
      this.scheduleRerender(true)
      return // TODO: should return promise that resolves when current render operation and scheduled rerender operation are finished
    }
    this.renderInProgress = true // TODO: make atomic with if statement

    if (! await this.shouldBeRendered()) {
      this.renderInProgress = false
      if (await this.shouldBeUnrendered()) {
        await this.unrender()
      }
      return
    }

    await this.executeRender()

    this.rendered = true
    this.renderInProgress = false

    await this.rerenderIfNecessary()
  }

  public async unrender(): Promise<void> {
    if (this.renderInProgress) {
      this.scheduleRerender(false)
      return // TODO: should return promise that resolves when current render operation and scheduled rerender operation are finished
    }
    this.renderInProgress = true // TODO: make atomic with if statement

    await this.executeUnrender()

    this.rendered = false
    this.renderInProgress = false

    await this.rerenderIfNecessary()
  }

  private scheduleRerender(render: boolean): void {
    this.rerenderAfterRenderFinished = render
    this.unrenderAfterRenderFinished = !render
  }

  private async rerenderIfNecessary(): Promise<void> {
    if (this.rerenderAfterRenderFinished && this.unrenderAfterRenderFinished) {
      util.logWarning('rerenderAfterRenderFinished and unrenderAfterRenderFinished are both true, this should not happen')
    }
    if (this.rerenderAfterRenderFinished) {
      this.rerenderAfterRenderFinished = false
      await this.render()
    } else if (this.unrenderAfterRenderFinished) {
      this.unrenderAfterRenderFinished = false
      await this.unrender()
    }
  }

  public abstract executeRender(): Promise<void>

  public abstract executeUnrender(): Promise<void>

  private async shouldBeRendered(): Promise<boolean> {
    const boxRect: Rect = await renderManager.getClientRectOf(this.referenceBox.getId())
    return this.isRectLargeEnoughToRender(boxRect) && this.isRectInsideScreen(boxRect)
  }

  private async shouldBeUnrendered(): Promise<boolean> {
    if (this.referenceBox.isRoot()) {
      return false
    }
    const boxRect: Rect = await renderManager.getClientRectOf(this.referenceBox.getId())
    return this.isRectSmallEnoughToUnrender(boxRect) || this.isRectNotablyOutsideScreen(boxRect)
  }

  private isRectLargeEnoughToRender(rect: Rect): boolean {
    return (rect.width+rect.height)/2 >= settings.getBoxMinSizeToRender()
  }

  private isRectSmallEnoughToUnrender(rect: Rect): boolean {
    return (rect.width+rect.height)/2 < settings.getBoxMinSizeToRender()*0.8
  }

  private isRectInsideScreen(rect: Rect): boolean {
    if (rect.x+rect.width < 0) {
      return false
    }
    if (rect.y+rect.height < 0) {
      return false
    }

    const clientSize = renderManager.getClientSize()
    if (rect.x > clientSize.width) {
      return false
    }
    if (rect.y > clientSize.height) {
      return false
    }

    return true
  }

  private isRectNotablyOutsideScreen(rect: Rect): boolean {
    if (rect.x+rect.width < -20) {
      return true
    }
    if (rect.y+rect.height < -20) {
      return true
    }

    const clientSize = renderManager.getClientSize()
    if (rect.x > clientSize.width+20) {
      return true
    }
    if (rect.y > clientSize.height+20) {
      return true
    }

    return false
  }

}
