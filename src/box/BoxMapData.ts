import { JsonObject } from '../JsonObject'
import { util } from '../util'
import { BoxMapLinkData } from './BoxMapLinkData'
import { LocalPosition } from './Transform'

export class BoxMapData extends JsonObject {
  public readonly id: string
  public x: number
  public y: number
  public width: number
  public height: number
  public links: BoxMapLinkData[]

  public static buildNew(x: number, y: number, width: number, height: number): BoxMapData {
    return new BoxMapData(util.generateId(), x, y, width, height, [])
  }

  public static buildFromJson(json: string ): BoxMapData /*| SyntaxError*/ {
    const parsedData: BoxMapData = JSON.parse(json) // parsed object has no functions

    let id: string = parsedData.id // TODO: delete this later
    if (id == null) {
      id = util.generateId()
    }

    let links: BoxMapLinkData[]
    let rawLinks: BoxMapLinkData[] = parsedData.links
    if (!rawLinks) {
      links = []
    } else {
      links = rawLinks.map(BoxMapLinkData.buildFromRawObject)
    }

    return new BoxMapData(id, parsedData.x, parsedData.y, parsedData.width, parsedData.height, links)
  }

  public constructor(id: string, x: number, y: number, width: number, height: number, links: BoxMapLinkData[]) {
    super()
    this.id = id
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.links = links

    this.validate()
  }

  public validate(): void {
    this.warnIf(this.id == null, 'id is null')
    this.warnIf(this.id == undefined, 'id is undefined')
    this.warnIf(this.id == '', 'id is empty')

    this.warnIf(this.x == null, 'x is null')
    this.warnIf(this.y == null, 'y is null')
    this.warnIf(this.width == null, 'width is null')
    this.warnIf(this.height == null, 'height is null')

    this.warnIf(this.x == undefined, 'x is undefined')
    this.warnIf(this.y == undefined, 'y is undefined')
    this.warnIf(this.width == undefined, 'width is undefined')
    this.warnIf(this.height == undefined, 'height is undefined')

    this.warnIf(this.x < 0, 'x is less than 0')
    this.warnIf(this.y < 0, 'y is less than 0')
    this.warnIf(this.width <= 0, 'width is not positive')
    this.warnIf(this.height <= 0, 'height is not positive')
    this.warnIf(this.x + this.width > 100, 'sum of x and width is greater than 100')
    this.warnIf(this.y + this.height > 100, 'sum of y and height is greater than 100')
  }

  private warnIf(condition: boolean, message: string) {
    if (condition) {
      this.warn(message)
    }
  }

  private warn(message: string): void {
    util.logWarning('BoxData: ' + message)
  }

  public toJson(): string {
    return util.toFormattedJson(this)
  }

  public getTopLeftPosition(): LocalPosition {
    return new LocalPosition(this.x, this.y)
  }

  public getBottomRightPosition(): LocalPosition {
    return new LocalPosition(this.x+this.width, this.y+this.height)
  }

}
