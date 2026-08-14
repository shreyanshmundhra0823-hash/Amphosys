import { BlockShell } from './BlockShell'
import { HeadingBlockEditor } from './blocks/HeadingBlockEditor'
import { ParagraphBlockEditor } from './blocks/ParagraphBlockEditor'
import { ListBlockEditor } from './blocks/ListBlockEditor'
import { TableBlockEditor } from './blocks/TableBlockEditor'
import { FlowchartBlockEditor } from './blocks/FlowchartBlockEditor'
import { MnemonicBlockEditor } from './blocks/MnemonicBlockEditor'
import { ExamBoxBlockEditor } from './blocks/ExamBoxBlockEditor'
import { ImageBlockEditor } from './blocks/ImageBlockEditor'
import { blockTypeLabels } from '@/lib/documentBlocks'
import type { Block } from '@/types/document'

interface BlockRendererProps {
  block: Block
  studyMaterialId: string
  historyVersion: number
  isFirst: boolean
  isLast: boolean
  onChange: (updater: (b: Block) => Block) => void
  onFocusBlock: () => void
  onBlurBlock: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onDelete: () => void
}

/** Dispatches a Block to its type-specific editor, wrapped in shared block chrome. */
export function BlockRenderer({
  block,
  studyMaterialId,
  historyVersion,
  isFirst,
  isLast,
  onChange,
  onFocusBlock,
  onBlurBlock,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete
}: BlockRendererProps) {
  return (
    <BlockShell
      label={blockTypeLabels[block.type]}
      isFirst={isFirst}
      isLast={isLast}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    >
      {(block.type === 'heading' || block.type === 'subheading') && (
        <HeadingBlockEditor
          block={block}
          historyVersion={historyVersion}
          onChange={onChange as never}
          onFocusBlock={onFocusBlock}
          onBlurBlock={onBlurBlock}
        />
      )}
      {block.type === 'paragraph' && (
        <ParagraphBlockEditor
          block={block}
          historyVersion={historyVersion}
          onChange={onChange as never}
          onFocusBlock={onFocusBlock}
          onBlurBlock={onBlurBlock}
        />
      )}
      {(block.type === 'bulletList' || block.type === 'numberedList') && (
        <ListBlockEditor
          block={block}
          historyVersion={historyVersion}
          onChange={onChange as never}
          onFocusBlock={onFocusBlock}
          onBlurBlock={onBlurBlock}
        />
      )}
      {block.type === 'table' && (
        <TableBlockEditor
          block={block}
          onChange={onChange as never}
          onFocusBlock={onFocusBlock}
          onBlurBlock={onBlurBlock}
        />
      )}
      {block.type === 'flowchart' && (
        <FlowchartBlockEditor
          block={block}
          onChange={onChange as never}
          onFocusBlock={onFocusBlock}
          onBlurBlock={onBlurBlock}
        />
      )}
      {block.type === 'mnemonic' && (
        <MnemonicBlockEditor
          block={block}
          onChange={onChange as never}
          onFocusBlock={onFocusBlock}
          onBlurBlock={onBlurBlock}
        />
      )}
      {block.type === 'examBox' && (
        <ExamBoxBlockEditor
          block={block}
          onChange={onChange as never}
          onFocusBlock={onFocusBlock}
          onBlurBlock={onBlurBlock}
        />
      )}
      {block.type === 'image' && (
        <ImageBlockEditor
          block={block}
          studyMaterialId={studyMaterialId}
          onChange={onChange as never}
          onFocusBlock={onFocusBlock}
          onBlurBlock={onBlurBlock}
        />
      )}
    </BlockShell>
  )
}
