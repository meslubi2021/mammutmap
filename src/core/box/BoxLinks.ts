import { util } from '../util/util'
import { renderManager } from '../RenderManager'
import { Box } from './Box'
import { Link } from '../link/Link'
import { LinkData } from '../mapData/LinkData'
import { WayPointData } from '../mapData/WayPointData'
import { LinkEndData } from '../mapData/LinkEndData'
import { NodeWidget } from '../node/NodeWidget'
import { Widget } from '../Widget'
import { SkipToNewestScheduler } from '../util/SkipToNewestScheduler'
import { AbstractNodeWidget } from '../AbstractNodeWidget'
import { log } from '../logService'
import { LocalPosition } from '../shape/LocalPosition'

export class BoxLinks extends Widget {
    private readonly referenceBox: Box
    private links: Link[] = []
    private rendered: boolean = false
    private renderScheduler: SkipToNewestScheduler = new SkipToNewestScheduler()

    public constructor(referenceBox: Box) {
      super()
      this.referenceBox = referenceBox
    }

    public getId(): string {
      return this.referenceBox.getId()+'Links'
    }

    public static async changeManagingBoxOfLinkAndSave(oldManagingBox: Box, newManagingBox: Box, link: Link): Promise<void> {
      if (link.getManagingBox() !== newManagingBox) {
        util.logWarning('managingBox '+link.getManagingBox().getSrcPath()+' of given link '+link.getId()+' does not match newManagingBox '+newManagingBox.getSrcPath())
      }
      if (newManagingBox.links.links.includes(link)) {
        util.logWarning('box '+newManagingBox.getSrcPath()+' already manages link '+link.getId())
      }
      if (!oldManagingBox.links.links.includes(link)) {
        util.logWarning('box '+oldManagingBox.getSrcPath()+' does not manage link '+link.getId())
      }
      const proms: Promise<any>[] = []

      newManagingBox.links.links.push(link)
      proms.push(renderManager.appendChildTo(newManagingBox.links.getId(), link.getId()))
      oldManagingBox.links.links.splice(oldManagingBox.links.links.indexOf(link), 1)

      newManagingBox.getMapLinkData().push(link.getData())
      oldManagingBox.getMapLinkData().splice(oldManagingBox.getMapLinkData().indexOf(link.getData()), 1)
      proms.push(newManagingBox.saveMapData())
      proms.push(oldManagingBox.saveMapData())

      await Promise.all(proms)
    }

    public async add(options: {
      from: Box|NodeWidget | {node: Box|NodeWidget, positionInFromNodeCoords?: LocalPosition}
      to: Box|NodeWidget | {node: Box|NodeWidget, positionInToNodeCoords?: LocalPosition}
      save: boolean
    }): Promise<Link> {
      const fromNode: Box|NodeWidget = options.from instanceof Box || options.from instanceof NodeWidget
        ? options.from
        : options.from.node
      const toNode: Box|NodeWidget = options.to instanceof Box || options.to instanceof NodeWidget
        ? options.to
        : options.to.node

      if (this.referenceBox !== fromNode && !this.referenceBox.isAncestorOf(fromNode)) {
        log.warning(`BoxLinks::add(from: ${fromNode.getName()}, to: ${toNode.getName()}) from is not an descendant of referred box (${this.referenceBox.getName()}).`)
      }
      if (this.referenceBox !== toNode && !this.referenceBox.isAncestorOf(toNode)) {
        log.warning(`BoxLinks::add(from: ${fromNode.getName()}, to: ${toNode.getName()}) to is not an descendant of referred box (${this.referenceBox.getName()}).`)
      }
      
      const link: Link = await Link.newOfEnds({from: options.from, to: options.to, managingBox: this.referenceBox})
      this.referenceBox.getMapLinkData().push(link.getData()) // TODO: move into Link?
      this.links.push(link)

      const ongoing: Promise<void>[] = []
      if (options.save) {
        ongoing.push(this.referenceBox.saveMapData())
      }
      await this.addPlaceholderFor(link)
      ongoing.push(link.render())
      await Promise.all([ongoing])

      return link
    }

    public async removeLink(link: Link): Promise<void> {
      if (!this.links.includes(link)) {
        util.logWarning('trying to remove link from box "'+this.referenceBox.getName()+'" that is not managed by that box')
        return
      }

      await link.unrender()
      await this.removePlaceholderFor(link)

      this.links.splice(this.links.indexOf(link), 1)
      this.referenceBox.getMapLinkData().splice(this.referenceBox.getMapLinkData().indexOf(link.getData()), 1)
      await this.referenceBox.saveMapData()
    }

    public async render(): Promise<void> { await this.renderScheduler.schedule(async () => {
      if (this.rendered) {
        // links that are connected to NodeWidgets need to be rerendered
        // because size of NodeWidgets is not percental // TODO: use smart css attributes to handle this
        this.links.filter(link => {
          return link.from.getDeepestRenderedWayPoint().linkable instanceof NodeWidget
            || link.to.getDeepestRenderedWayPoint().linkable instanceof NodeWidget
        }).forEach(link => link.render())
        return
      }

      const placeholderPros: Promise<void>[] = []

      for (const linkData of this.referenceBox.getMapLinkData()) {
        if (this.links.find(link => link.getId() === linkData.id)) {
          continue
        }
        const link: Link = Link.new(linkData, this.referenceBox)
        this.links.push(link)
        placeholderPros.push(this.addPlaceholderFor(link))
      }

      await Promise.all(placeholderPros)
      await Promise.all(this.links.map((link: Link) => link.render()))
      this.rendered = true
    })}

    private async addPlaceholderFor(link: Link): Promise<void> {
      await renderManager.addContentTo(this.getId(), '<div id="'+link.getId()+'"></div>')
    }

    private async removePlaceholderFor(link: Link): Promise<void> {
      await renderManager.remove(link.getId())
    }

    public async unrender(): Promise<void> { await this.renderScheduler.schedule(async () => {
      if (!this.rendered) {
        return
      }

      await Promise.all(this.links.map(async (link: Link) => {
        await link.unrender()
        await this.removePlaceholderFor(link)
      }))
      this.links = []
      this.rendered = false
    })}

    /** @deprecated use findLinkRoute(..) instead */
    public getLinkWithEndBoxes(from: Box, to: Box): Link|undefined {
      return this.links.find((link: Link) => {
        const linkFromWayPoints: WayPointData[] = link.getData().from.path
        const linkToWayPoints: WayPointData[] = link.getData().to.path
        const linkFromBoxId: string = linkFromWayPoints[linkFromWayPoints.length-1].boxId
        const linkToBoxId: string = linkToWayPoints[linkToWayPoints.length-1].boxId
        return linkFromBoxId === from.getId() && linkToBoxId === to.getId()
      })
    }

    public static findLinkRoute(from: AbstractNodeWidget, to: AbstractNodeWidget, options: {maxHops: number} = {maxHops: 4}): Link[]|undefined {
      const directed: boolean = false
      if (options.maxHops < 0) {
        return undefined
      }
      for (const link of from.borderingLinks.getOutgoing()) {
        const node: AbstractNodeWidget = link.to.getDeepestRenderedWayPoint().linkable
        if (node.getId() === to.getId()) {
          return [link]
        }
        if (!(node instanceof NodeWidget)) {
          continue
        }
        const linkToPath: WayPointData[] = link.getData().to.path
        const linkTargetId: string = linkToPath[linkToPath.length-1].boxId
        if (linkTargetId !== node.getId()) {
          log.warning(`BoxLinks::getLinkRouteWithEndBoxes(..) linkTargetId(${linkTargetId}) does not match deepestRenderedNodeId(${node.getId()}).`)
        }
        const route: Link[]|undefined = this.findLinkRoute(node, to, {maxHops: options.maxHops-1})
        if (route) {
          return [link, ...route]
        }
      }
      return undefined
    }

    public getLinks(): Link[] {
      return this.links
    }

}
