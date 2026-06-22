import { visit } from "unist-util-visit";

const calloutTypes = new Set(["tip", "note", "warning", "danger", "info"]);

type Node = {
  type: string;
  name?: string;
  attributes?: Record<string, unknown>;
  children?: Node[];
  value?: string;
  data?: Record<string, unknown>;
};

type Parent = {
  children?: Node[];
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

const createAttribute = (name: string, value: string) => ({
  type: "mdxJsxAttribute",
  name,
  value,
});

export default function remarkCallouts() {
  return (tree: unknown) => {
    visit(tree as Node, "containerDirective", (node: Node, index: number | undefined, parent: Parent | undefined) => {
      if (typeof index !== "number" || !parent?.children) return;
      if (!node.name || !calloutTypes.has(node.name)) return;

      const children = [...(node.children ?? [])];
      let title = "";

      const firstChild = children[0];
      if (firstChild?.type === "paragraph" && firstChild.data?.directiveLabel === true) {
        title = getPlainText(firstChild.children);
        children.shift();
      }

      const explicitTitle =
        typeof node.attributes?.title === "string"
          ? node.attributes.title
          : typeof node.attributes?.label === "string"
            ? node.attributes.label
            : "";

      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "Callout",
        attributes: [
          createAttribute("type", node.name),
          ...(explicitTitle || title ? [createAttribute("title", explicitTitle || title)] : []),
        ],
        children,
      };
    });
  };
}
