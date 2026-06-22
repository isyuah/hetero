import { visit } from "unist-util-visit";

type Node = {
  type: string;
  name?: string;
  attributes?: Record<string, unknown>;
  children?: Node[];
  value?: string;
  data?: Record<string, unknown>;
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

type Parent = {
  children?: Node[];
};

type FileTreeItem = {
  name: string;
  type: "file" | "folder";
  icon?: string;
  open?: boolean;
  active?: boolean;
  badge?: string;
  comment?: string;
  children?: FileTreeItem[];
};

type FileTreeLine = {
  indent: number;
  item: FileTreeItem;
};

const fileTreeImport = 'import FileTree from "@/components/mdx/FileTree.astro";';

const getPlainText = (nodes: Node[] = []): string => {
  return nodes
    .map((node) => {
      if (typeof node.value === "string") return node.value;
      if (node.children) return getPlainText(node.children);
      return "";
    })
    .join("")
    .trim();
};

const createAttribute = (name: string, value: string) => ({
  type: "mdxJsxAttribute",
  name,
  value,
});

const createImportNode = () => ({
  type: "mdxjsEsm",
  value: fileTreeImport,
  data: {
    estree: {
      type: "Program",
      sourceType: "module",
      body: [
        {
          type: "ImportDeclaration",
          source: {
            type: "Literal",
            value: "@/components/mdx/FileTree.astro",
            raw: '"@/components/mdx/FileTree.astro"',
          },
          specifiers: [
            {
              type: "ImportDefaultSpecifier",
              local: {
                type: "Identifier",
                name: "FileTree",
              },
            },
          ],
        },
      ],
    },
  },
});

const getDirectiveRawBody = (source: string, node: Node) => {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== "number" || typeof end !== "number") return "";

  const raw = source.slice(start, end);
  const lines = raw.split(/\r?\n/);
  if (lines.length <= 2) return "";

  return lines.slice(1, -1).join("\n");
};

const readLabel = (node: Node) => {
  const firstChild = node.children?.[0];
  if (firstChild?.type !== "paragraph" || firstChild.data?.directiveLabel !== true) {
    return "";
  }

  return getPlainText(firstChild.children);
};

const stripLabelLine = (body: string, node: Node) => {
  const firstChild = node.children?.[0];
  if (firstChild?.type !== "paragraph" || firstChild.data?.directiveLabel !== true) {
    return body;
  }

  return body.replace(/^\[[^\]]*]\r?\n?/, "");
};

const tokenizeAttributes = (raw: string) => {
  const tokens: string[] = [];
  const pattern = /"[^"]*"|'[^']*'|\S+/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw))) {
    tokens.push(match[0]);
  }

  return tokens;
};

const unquote = (value: string) => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};

const applyAttribute = (item: FileTreeItem, token: string) => {
  if (token === "active") {
    item.active = true;
    return;
  }

  if (token === "open") {
    item.open = true;
    return;
  }

  if (token === "closed") {
    item.open = false;
    return;
  }

  const separator = token.indexOf("=");
  if (separator === -1) return;

  const key = token.slice(0, separator);
  const value = unquote(token.slice(separator + 1));

  if (key === "tag" || key === "badge") {
    item.badge = value;
    return;
  }

  if (key === "desc" || key === "comment") {
    item.comment = value;
    return;
  }

  if (key === "icon") {
    item.icon = value;
  }
};

const parseFileTreeLine = (line: string): FileTreeLine | null => {
  if (!line.trim()) return null;

  const indent = line.match(/^\s*/)?.[0].length ?? 0;
  const content = line.trimEnd();
  const [pathPart, attrsPart = ""] = content.split(/\s::\s/, 2);
  const name = pathPart.trim();
  if (!name) return null;

  const isFolder = name.endsWith("/");
  const item: FileTreeItem = {
    name: isFolder ? name.slice(0, -1) : name,
    type: isFolder ? "folder" : "file",
  };

  tokenizeAttributes(attrsPart).forEach((token) => applyAttribute(item, token));

  if (item.type === "folder" && item.open === undefined) {
    item.open = true;
  }

  return { indent, item };
};

const parseFileTree = (body: string): FileTreeItem[] => {
  const root: FileTreeItem[] = [];
  const stack: Array<{ indent: number; item: FileTreeItem; children: FileTreeItem[] }> = [
    { indent: -1, item: { name: "", type: "folder", children: root }, children: root },
  ];

  body
    .split(/\r?\n/)
    .map(parseFileTreeLine)
    .filter((line): line is FileTreeLine => Boolean(line))
    .forEach(({ indent, item }) => {
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      parent.children.push(item);

      if (item.type === "folder") {
        item.children = [];
        stack.push({ indent, item, children: item.children });
      }
    });

  return root;
};

const hasFileTreeImport = (tree: Node) => {
  return tree.children?.some((node) => (
    node.type === "mdxjsEsm" &&
    typeof node.value === "string" &&
    /import\s+FileTree\s+from\s+["']/.test(node.value)
  )) ?? false;
};

export default function remarkFileTree() {
  return (tree: unknown, file: { value?: unknown }) => {
    const root = tree as Node;
    let usedFileTree = false;
    const source = String(file.value ?? "");

    visit(root, "containerDirective", (node: Node, index: number | undefined, parent: Parent | undefined) => {
      if (typeof index !== "number" || !parent?.children) return;
      if (node.name !== "filetree") return;

      const title = readLabel(node);
      const rawBody = stripLabelLine(getDirectiveRawBody(source, node), node);
      const items = parseFileTree(rawBody);

      usedFileTree = true;
      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "FileTree",
        attributes: [
          ...(title ? [createAttribute("title", title)] : []),
          createAttribute("itemsJson", JSON.stringify(items)),
        ],
        children: [],
      };
    });

    if (usedFileTree && !hasFileTreeImport(root)) {
      root.children?.unshift(createImportNode());
    }
  };
}
