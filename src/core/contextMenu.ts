import { util } from './util/util'
import { Box } from './box/Box'
import { FileBox } from './box/FileBox'
import { FolderBox } from './box/FolderBox'
import { Link } from './link/Link'
import { relocationDragManager } from './RelocationDragManager'
import { ClientPosition } from './shape/ClientPosition'
import { LocalPosition } from './shape/LocalPosition'
import { BoxData } from './mapData/BoxData'
import { TextInputPopup } from './TextInputPopup'
import { SourcelessBox } from './box/SourcelessBox'
import { NodeData } from './mapData/NodeData'
import { PopupWidget } from './PopupWidget'
import { settings } from './settings/settings'
import { NodeWidget } from './node/NodeWidget'
import { MenuItem } from './applicationMenu/MenuItem'
import { MenuItemFolder } from './applicationMenu/MenuItemFolder'
import { MenuItemFile } from './applicationMenu/MenuItemFile'
import { RenderElements } from './util/RenderElement'
import { environment } from './environmentAdapter'

let contextMenuPopup: ContextMenuPopup

export function init(popupImpl: ContextMenuPopup): void {
  contextMenuPopup = popupImpl
}

export interface ContextMenuPopup {
  popup(items: MenuItem[], position: ClientPosition): void
}

const fileBoxMenuItemGenerators: ((box: FileBox) => MenuItem|undefined)[] = []

export function addFileBoxMenuItem(generator: (box: FileBox) => MenuItem|undefined): void {
  fileBoxMenuItemGenerators.push(generator)
}

export function openForFileBox(box: FileBox, position: ClientPosition): void {
  const items: MenuItem[] = [
    //buildOpenFileInEditorItem(box),
    buildAddLinkItem(box, position),
    buildAddNodeItem(box, position),
    buildRenameBoxItem(box),
    buildRemoveOutgoingLinksItem(box)
  ]

  if (settings.getBoolean('developerMode')) {
    items.push(buildDetailsItem('FileBoxDetails', box))
  }

  fileBoxMenuItemGenerators.forEach(async generator => {
    const menuItem: MenuItem|undefined = generator(box)
    if (menuItem) {
      items.push(menuItem)
    }
  })

  contextMenuPopup.popup(items, position)
}

export function openForFolderBox(box: FolderBox, position: ClientPosition): void {
  const items: MenuItem[] = [
    buildAddLinkItem(box, position),
    buildAddNodeItem(box, position),
    buildRenameBoxItem(box),
    buildAddNewFileItem(box, position),
    buildAddNewFolderItem(box, position),
    buildRemoveOutgoingLinksItem(box)
  ]

  if (settings.getBoolean('developerMode')) {
    items.push(buildDetailsItem('FolderBoxDetails', box))
  }

  contextMenuPopup.popup(items, position)
}

export function openForSourcelessBox(box: SourcelessBox, position: ClientPosition): void {
  const items: MenuItem[] = [
    buildAddLinkItem(box, position),
    buildAddNodeItem(box, position),
    buildRenameBoxItem(box)
  ]

  if (settings.getBoolean('developerMode')) {
    items.push(buildDetailsItem('SourcelessBoxDetails', box))
  }

  contextMenuPopup.popup(items, position)
}

export function openForLinkNode(linkNode: NodeWidget, position: ClientPosition): void {
  const items: MenuItem[] = [
    buildAddLinkItem(linkNode, position),
    buildRemoveLinkNodeItem(linkNode)
  ]

  if (settings.getBoolean('developerMode')) {
    items.push(buildDetailsItem('NodeDetails', linkNode))
  }

  contextMenuPopup.popup(items, position)
}

export function openForLink(link: Link, position: ClientPosition): void {
  const items: MenuItem[] = [
    buildTagLinkItemFolder(link),
    buildRemoveLinkItem(link)
  ]

  if (settings.getBoolean('developerMode')) {
    items.push(buildDetailsItem('LinkDetails', link))
  }

  contextMenuPopup.popup(items, position)
}

function buildOpenFileInEditorItem(box: FileBox): MenuItemFile {
  return new MenuItemFile({label: 'open', click: () => {
    environment.openFile(box.getSrcPath())
  }})
}

function buildAddLinkItem(node: Box|NodeWidget, position: ClientPosition): MenuItemFile {
  const managingBoxAtStart: Box = node instanceof Box ? node : node.getParent()
  return new MenuItemFile({label: 'link from here', click: () => addLinkWithClickToDropMode(managingBoxAtStart, position, node)})
}

function buildRemoveOutgoingLinksItem(box: Box): MenuItemFile {
  return new MenuItemFile({label: 'remove all outgoing links', click: () => {
    box.borderingLinks.getOutgoing().forEach(link => link.getManagingBoxLinks().removeLink(link))
  }})
}

function buildAddNodeItem(box: Box, position: ClientPosition): MenuItemFile {
  return new MenuItemFile({label: 'add link node here', click: () => addNodeToBox(box, position)})
}

function buildRemoveLinkNodeItem(linkNode: NodeWidget): MenuItemFile {
  return new MenuItemFile({label: 'remove link node', click: async () => {
    if (linkNode.borderingLinks.getAll().length === 0) {
      linkNode.getParent().nodes.remove(linkNode, {mode: 'reorder bordering links'})
      return
    }

    const pupup: PopupWidget = await PopupWidget.newAndRender({title: 'Remove LinkNode', content: [
      {
        type: 'div', 
        children: `Link node '${linkNode.getName()}' has bordering links.`
      },
      {
        type: 'button',
        style: {margin: '4px', cursor: 'pointer'},
        children: 'reorder bordering links',
        onclick: () => {
          linkNode.getParent().nodes.remove(linkNode, {mode: 'reorder bordering links'})
          pupup.unrender()
        }
      },
      {
        type: 'button',
        style: {margin: '4px', cursor: 'pointer'},
        children: 'remove bordering links', 
        onclick: () => {
          linkNode.getParent().nodes.remove(linkNode, {mode: 'remove bordering links'})
          pupup.unrender()
        }
      }
    ]})
  }})
}

function buildTagLinkItemFolder(link: Link): MenuItemFolder {
  let tags: string[] = link.getManagingBox().getProjectSettings().getLinkTagNamesWithDefaults()

  for (const includedTag of link.getTags()) {
    if (!tags.find(tag => tag === includedTag)) {
      util.logWarning('Corrupted projectSettings detected, expected all linkTags to be registered in projectSettings, but '+includedTag+' was not.')
      link.getManagingBox().getProjectSettings().countUpLinkTagAndSave(includedTag)
      tags.push(includedTag)
    }
  }

  const items: MenuItem[] =  tags.map(tag => buildTagLinkItem(link, tag))
  items.push(buildAddOtherTagLinkItem(link))

  return new MenuItemFolder({label: 'tag', submenu: items})
}

function buildAddOtherTagLinkItem(link: Link): MenuItemFile {
  return new MenuItemFile({label: 'other...', click: async () => {
    const fromBoxName: string = link.from.getDeepestRenderedWayPoint().linkable.getName()
    const toBoxName: string = link.to.getDeepestRenderedWayPoint().linkable.getName()
    const tagName: string|undefined = await TextInputPopup.buildAndRenderAndAwaitResolve(`tag link ${link.getId()} between ${fromBoxName} and ${toBoxName}`, '')
    if (tagName) {
      link.addTag(tagName)
    } else {
      util.logInfo('Dialog to add tag to link was closed without input.')
    }
  }})
}

function buildTagLinkItem(link: Link, tag: string): MenuItemFile {
  const tagIncluded: boolean = link.includesTag(tag)
  return new MenuItemFile({
    label: tagIncluded ? '✓ '+tag : '    '+tag,
    click: tagIncluded ? () => link.removeTag(tag) : () => link.addTag(tag)
  })
}

function buildRemoveLinkItem(link: Link): MenuItemFile {
  return new MenuItemFile({label: 'remove link', click: () => link.getManagingBoxLinks().removeLink(link)})
}

function buildRenameBoxItem(box: Box): MenuItemFile {
  return new MenuItemFile({label: 'rename', click: async () => {
    const newName: string|undefined = await TextInputPopup.buildAndRenderAndAwaitResolve('Rename Box', box.getName())
    if (newName) {
      await box.rename(newName)
    }
  }})
}

function buildAddNewFileItem(box: FolderBox, position: ClientPosition): MenuItemFile {
  return new MenuItemFile({label: 'new file', click: async () => {
    const mapData: BoxData = await buildMapDataForNewBox(box, position)
    await box.addNewFileAndSave(mapData.id, mapData)
    //ScaleManager.startWithClickToDropMode(newBox) // TODO: implement
  }})
}

function buildAddNewFolderItem(box: FolderBox, position: ClientPosition): MenuItemFile {
  return new MenuItemFile({label: 'new folder', click: async () => {
    const mapData: BoxData = await buildMapDataForNewBox(box, position)
    await box.addNewFolderAndSave(mapData.id, mapData)
    //ScaleManager.startWithClickToDropMode(newBox) // TODO: implement
  }})
}

async function buildMapDataForNewBox(parentBox: FolderBox, position: ClientPosition): Promise<BoxData> {
  const positionInParentBox: LocalPosition = await parentBox.transform.clientToLocalPosition(position)
  return BoxData.buildNew(positionInParentBox.percentX, positionInParentBox.percentY, 16, 8)
}

function buildDetailsItem(title: string, object: any): MenuItemFile {
  return new MenuItemFile({
    label: 'details',
    click: () => {
      buildDetailsPopupWidget(title, object).render()
    }
  })
}

function buildDetailsPopupWidget(title: string, object: any): PopupWidget {
  // TODO: move to own file
  return new class extends PopupWidget {
    public constructor() {
      super(util.generateId()+title, title)
    }
    protected formContent(): RenderElements {
      // TODO: render this in zoomable map would be cool, introduce ObjectBox|JsonBox for this, or better handled by plugin?
      return {
        type: 'pre',
        innerHTML: util.escapeForHtml(util.stringify(object))
      }
    }
  }
}

// TODO: move into Box?
async function addLinkWithClickToDropMode(managingBoxAtStart: Box, positionAtStart: ClientPosition, fromNode: Box|NodeWidget): Promise<void> {
  const positionAtStartInBox: LocalPosition = await managingBoxAtStart.transform.clientToLocalPosition(positionAtStart)

  const from = {node: fromNode, positionInFromNodeCoords: positionAtStartInBox}
  const to = {node: managingBoxAtStart, positionInToNodeCoords: positionAtStartInBox}
  const link: Link = await managingBoxAtStart.links.add({from, to, save: false})

  await relocationDragManager.startDragWithClickToDropMode(link.to)
}

async function addNodeToBox(box: Box, position: ClientPosition): Promise<void> {
  const positionInBox: LocalPosition = await box.transform.clientToLocalPosition(position)
  await box.nodes.add(NodeData.buildNew(positionInBox.percentX, positionInBox.percentY))
}
