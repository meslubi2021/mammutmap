import { ElementAttributes, RenderElement, RenderElements, Style } from './util/RenderElement'
import { ClientRect } from './ClientRect'
import { ClientPosition } from './shape/ClientPosition'

export type MouseEventType = 'click'|'contextmenu'|'mousedown'|'mouseup'|'mousemove'|'mouseover'|'mouseout'|'mouseenter'|'mouseleave'
export type DragEventType = 'dragstart'|'drag'|'dragend'|'dragenter'
export type WheelEventType = 'wheel'
export type InputEventType = 'change'
export type KeyboardEventType = 'keydown'|'keyup'
export type EventType = MouseEventType|DragEventType|WheelEventType|InputEventType|KeyboardEventType

export const mouseEventAdvancedDefaultOptions = {stopPropagation: true}
export type MouseEventResultAdvanced = {
  position: ClientPosition,
  ctrlPressed: boolean,
  cursor: 'auto'|'default'|'pointer'|'grab'|'ns-resize'|'ew-resize'|'nwse-resize',
  targetPathElementIds: string[]
}

export type BatchMethod = 'appendChildTo'|'addContentTo'|'addElementsTo'|'addElementTo'|'setElementsTo'|'setElementTo'|'innerHTML'|'style'|'addClassTo'|'removeClassFrom'

export let dom: DocumentObjectModelAdapter

export function init(object: DocumentObjectModelAdapter): void {
  dom = object
}

export interface DocumentObjectModelAdapter {

   openDevTools(): void

   getClientSize(): {width: number, height: number}
   getCursorClientPosition(): {x: number, y: number}
   isElementHovered(id: string): Promise<boolean>
   getClientRectOf(id: string): Promise<ClientRect>

   batch(batch: {elementId: string, method: BatchMethod, value: string|RenderElement|RenderElements}[]): Promise<void>

   appendChildTo(parentId: string, childId: string): Promise<void>
   addContentTo(id: string, content: string): Promise<void>
   addElementsTo(id: string, elements: RenderElements): Promise<void>
   addElementTo(id: string, element: RenderElement): Promise<void>
   setElementsTo(id: string, elements: RenderElements): Promise<void>
   setElementTo(id: string, element: RenderElement): Promise<void>
   setContentTo(id: string, content: string): Promise<void>
   clearContentOf(id: string): Promise<void>
   remove(id: string): Promise<void>

   setStyleTo(id: string, style: string): Promise<void>
   addClassTo(id: string, className: string): Promise<void>
   removeClassFrom(id: string, className: string): Promise<void>
   containsClass(id: string, className: string): Promise<boolean>
   getClassesOf(id: string): Promise<string[]>
   modifyCssRule(cssRuleName: string, propertyName: string, propertyValue: string): Promise<{propertyValueBefore: string}>

   getValueOf(id: string): Promise<string>
   setValueTo(id: string, value: string): Promise<void>

   scrollToBottom(id: string): Promise<void>

   addKeydownListenerTo(id: string, key: 'Enter', callback: (value: string) => void): Promise<void>

   addChangeListenerTo<RETURN_TYPE>(
    id: string,
    returnField: 'value'|'checked',
    callback: (value: RETURN_TYPE) => void
  ): Promise<void>

   addWheelListenerTo(id: string, callback: (delta: number, clientX: number, clientY: number) => void): Promise<void>

   addEventListenerAdvancedTo(
    id: string,
    eventType: MouseEventType,
    options: {stopPropagation?: boolean, capture?: boolean},
    callback: (result: MouseEventResultAdvanced) => void
  ): Promise<void>

   addEventListenerTo(
    id: string,
    eventType: MouseEventType,
    callback: (clientX: number, clientY: number, ctrlPressed: boolean) => void
  ): Promise<void>

   addDragListenerTo(
    id: string,
    eventType: DragEventType,
    callback: (clientX: number, clientY: number, ctrlPressed: boolean) => void
  ): Promise<void>

   removeEventListenerFrom(id: string, eventType: EventType): Promise<void>

   getIpcChannelsCount(): number
}
