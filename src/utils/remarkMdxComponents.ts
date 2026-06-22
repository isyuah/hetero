import { visit } from "unist-util-visit";

type Node = {
  type: string;
  name?: string;
  lang?: string;
  meta?: string;
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

type ImportSpec = {
  localName: string;
  importPath: string;
};

const componentImports: Record<string, ImportSpec> = {
  Mermaid: {
    localName: "Mermaid",
    importPath: "@/components/mdx/Mermaid.astro",
  },
  Collapse: {
    localName: "Collapse",
    importPath: "@/components/mdx/Collapse.astro",
  },
};

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

const createAttribute = (name: string, value: string | boolean) => ({
  type: "mdxJsxAttribute",
  name,
  value,
});

const createImportNode = ({ localName, importPath }: ImportSpec) => ({
  type: "mdxjsEsm",
  value: `import ${localName} from "${importPath}";`,
  data: {
    estree: {
      type: "Program",
      sourceType: "module",
      body: [
        {
          type: "ImportDeclaration",
          source: {
            type: "Literal",
            value: importPath,
            raw: `"${importPath}"`,
          },
          specifiers: [
            {
              type: "ImportDefaultSpecifier",
              local: {
                type: "Identifier",
                name: localName,
              },
            },
          ],
        },
      ],
    },
  },
});

const hasImport = (tree: Node, localName: string) => {
  return tree.children?.some((node) => (
    node.type === "mdxjsEsm" &&
    typeof node.value === "string" &&
    new RegExp(`import\\s+${localName}\\s+from\\s+["']`).test(node.value)
  )) ?? false;
};

const readLabel = (node: Node) => {
  const firstChild = node.children?.[0];
  if (firstChild?.type !== "paragraph" || firstChild.data?.directiveLabel !== true) {
    return "";
  }

  return getPlainText(firstChild.children);
};

const getDirectiveRawBody = (source: string, node: Node) => {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== "number" || typeof end !== "number") return "";

  const raw = source.slice(start, end);
  const lines = raw.split(/\r?\n/);
  if (lines.length <= 2) return "";

  return lines.slice(1, -1).join("\n");
};

const stripLabelLine = (body: string, node: Node) => {
  const firstChild = node.children?.[0];
  if (firstChild?.type !== "paragraph" || firstChild.data?.directiveLabel !== true) {
    return body;
  }

  return body.replace(/^\[[^\]]*]\r?\n?/, "");
};

const hasTruthyAttribute = (node: Node, names: string[]) => {
  return names.some((name) => node.attributes?.[name] === "" || node.attributes?.[name] === true);
};

const getMetaTitle = (meta: string | undefined) => {
  if (!meta) return "";

  const quoted = meta.match(/(?:^|\s)title=(["'])(.*?)\1/);
  if (quoted) return quoted[2].trim();

  const bracketed = meta.match(/\[([^\]]+)]/);
  if (bracketed) return bracketed[1].trim();

  return "";
};

export default function remarkMdxComponents() {
  return (tree: unknown, file: { value?: unknown }) => {
    const root = tree as Node;
    const usedComponents = new Set<string>();
    const source = String(file.value ?? "");

    visit(root, "code", (node: Node, index: number | undefined, parent: Parent | undefined) => {
      if (typeof index !== "number" || !parent?.children) return;
      if (node.lang !== "mermaid") return;

      const title = getMetaTitle(node.meta);

      usedComponents.add("Mermaid");
      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [
          ...(title ? [createAttribute("title", title)] : []),
          createAttribute("code", node.value ?? ""),
        ],
        children: [],
      };
    });

    visit(root, "containerDirective", (node: Node, index: number | undefined, parent: Parent | undefined) => {
      if (typeof index !== "number" || !parent?.children) return;

      if (node.name === "mermaid") {
        const title = readLabel(node);
        const code = stripLabelLine(getDirectiveRawBody(source, node), node).trim();

        usedComponents.add("Mermaid");
        parent.children[index] = {
          type: "mdxJsxFlowElement",
          name: "Mermaid",
          attributes: [
            ...(title ? [createAttribute("title", title)] : []),
            createAttribute("code", code),
          ],
          children: [],
        };
        return;
      }

      if (node.name === "collapse" || node.name === "details") {
        const title = readLabel(node) || "Details";
        const children = [...(node.children ?? [])];
        if (children[0]?.type === "paragraph" && children[0].data?.directiveLabel === true) {
          children.shift();
        }

        usedComponents.add("Collapse");
        parent.children[index] = {
          type: "mdxJsxFlowElement",
          name: "Collapse",
          attributes: [
            createAttribute("title", title),
            ...(hasTruthyAttribute(node, ["open", "defaultOpen"]) ? [createAttribute("open", true)] : []),
          ],
          children,
        };
      }
    });

    for (const componentName of [...usedComponents].reverse()) {
      const spec = componentImports[componentName];
      if (!spec || hasImport(root, spec.localName)) continue;
      root.children?.unshift(createImportNode(spec));
    }
  };
}
