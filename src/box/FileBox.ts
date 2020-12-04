import * as util from '../util'
import * as dom from '../domAdapter'
import { Box } from './Box'
import { DirectoryBox } from './DirectoryBox'
import { Path } from '../Path'

export class FileBox extends Box {

  public constructor(path: Path, id: string, parent: DirectoryBox) {
    super(path, id, parent)
  }

  protected getOverflow(): 'hidden' {
    return 'hidden'
  }

  protected getAdditionalStyle(): null {
    return null
  }

  protected renderBody(): void {
    util.readFileAndConvertToHtml(super.getPath().getSrcPath(), (dataConvertedToHtml: string) => {
      let content: string = '<pre style="margin:0px;">' + dataConvertedToHtml + '</pre>'
      dom.addContentTo(super.getId(), content)
    })
  }

}
