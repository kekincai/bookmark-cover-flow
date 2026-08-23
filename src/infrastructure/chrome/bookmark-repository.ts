import type { Bookmark, BookmarkFolder, BookmarkRepository } from '../../domain/bookmark'

interface BookmarkNodeLike {
  readonly id: string
  readonly parentId?: string
  readonly title: string
  readonly url?: string
  readonly children?: readonly BookmarkNodeLike[]
}

function toBookmark(node: BookmarkNodeLike): Bookmark | undefined {
  if (node.url === undefined) return undefined
  return {
    id: node.id,
    title: node.title,
    url: node.url,
    ...(node.parentId === undefined ? {} : { parentId: node.parentId }),
  }
}

function toFolder(node: BookmarkNodeLike, parentId?: string): BookmarkFolder {
  const childNodes = node.children ?? []
  return {
    id: node.id,
    title: node.title || 'Bookmarks',
    ...(parentId === undefined ? {} : { parentId }),
    children: childNodes.flatMap((child) => {
      const bookmark = toBookmark(child)
      return bookmark === undefined ? [] : [bookmark]
    }),
    folders: childNodes
      .filter((child) => child.url === undefined)
      .map((child) => toFolder(child, node.id)),
  }
}

export function mapChromeTree(nodes: readonly BookmarkNodeLike[]): readonly BookmarkFolder[] {
  const root = nodes[0]
  if (root === undefined) return []
  return (root.children ?? [])
    .filter((node) => node.url === undefined)
    .map((node) => toFolder(node))
}

const demoFolders: readonly BookmarkFolder[] = [
  {
    id: 'demo-favorites',
    title: 'Favorites',
    folders: [
      {
        id: 'demo-development',
        parentId: 'demo-favorites',
        title: 'Development',
        children: [
          { id: 'dev-1', title: 'GitHub', url: 'https://github.com' },
          { id: 'dev-2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
          { id: 'dev-3', title: 'TypeScript', url: 'https://www.typescriptlang.org' },
        ],
        folders: [],
      },
      {
        id: 'demo-design',
        parentId: 'demo-favorites',
        title: 'Design',
        children: [
          { id: 'design-1', title: 'Figma', url: 'https://figma.com' },
          { id: 'design-2', title: 'Design Notes', url: 'https://www.notion.so' },
        ],
        folders: [],
      },
    ],
    children: [
      { id: 'demo-1', title: 'Design Notes', url: 'https://www.notion.so' },
      { id: 'demo-2', title: 'GitHub', url: 'https://github.com' },
      { id: 'demo-3', title: 'Figma', url: 'https://figma.com' },
      { id: 'demo-4', title: 'Readwise', url: 'https://readwise.io' },
      { id: 'demo-5', title: 'Apple Developer', url: 'https://developer.apple.com' },
      { id: 'demo-6', title: 'Linear', url: 'https://linear.app' },
      { id: 'demo-7', title: 'The Browser Company', url: 'https://thebrowser.company' },
      { id: 'demo-8', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
      { id: 'demo-9', title: 'TypeScript', url: 'https://www.typescriptlang.org' },
    ],
  },
  {
    id: 'demo-reading',
    title: 'Reading',
    folders: [
      {
        id: 'demo-longform',
        parentId: 'demo-reading',
        title: 'Longform',
        children: [
          { id: 'long-1', title: 'Aeon', url: 'https://aeon.co' },
          { id: 'long-2', title: 'Longreads', url: 'https://longreads.com' },
        ],
        folders: [],
      },
    ],
    children: [
      { id: 'r1', title: 'The Marginalian', url: 'https://www.themarginalian.org' },
      { id: 'r2', title: 'Aeon', url: 'https://aeon.co' },
      { id: 'r3', title: 'Longreads', url: 'https://longreads.com' },
    ],
  },
]

export function createBookmarkRepository(): BookmarkRepository {
  return {
    async getTree(): Promise<readonly BookmarkFolder[]> {
      if (typeof chrome === 'undefined' || chrome.bookmarks?.getTree === undefined)
        return demoFolders
      const tree = await chrome.bookmarks.getTree()
      return mapChromeTree(tree)
    },
  }
}
