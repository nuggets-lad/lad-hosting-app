export type SiteframePart = {
  id: string;
  type: string;
  attributes: Record<string, string>;
  content: string;
};

export type SiteframeBlock = {
  id: string;
  type: string;
  attributes: Record<string, string>;
  content: string;
};

export type SiteframePage = {
  id: string;
  attributes: Record<string, string>;
  blocks: SiteframeBlock[];
};

export type SiteframeDocument = {
  parts: SiteframePart[];
  pages: SiteframePage[];
};

const shouldUnescapePayload = (value: string): boolean => {
  if (!value || !value.includes("\\")) {
    return false;
  }
  const lowered = value.toLowerCase();
  return lowered.includes('\\"siteframe') || lowered.includes('\\n<!--siteframe') || lowered.includes('\\/siteframe');
};

const unescapePayload = (value: string): string =>
  value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

export const normalizeSiteframePayload = (payload: string): string => {
  if (!payload) {
    return "";
  }
  return shouldUnescapePayload(payload) ? unescapePayload(payload) : payload;
};

const parseAttributes = (raw: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(raw)) !== null) {
    const [, key, value] = match;
    attributes[key] = value;
  }
  return attributes;
};

const attributesToString = (attributes: Record<string, string>): string =>
  Object.entries(attributes)
    .map(([key, value]) => `${key}="${value.replace(/"/g, '&quot;')}"`)
    .join(" ")
    .trim();

const generateId = (prefix: string, index: number) => `${prefix}-${index}`;

export const parseSiteframePayload = (payload: string): SiteframeDocument => {
  const source = normalizeSiteframePayload(payload);
  const parts: SiteframePart[] = [];
  const pages: SiteframePage[] = [];

  const partRegex = /<!--siteframe:part([^>]*)-->([\s\S]*?)<!--\/siteframe:part-->/gi;
  let partMatch: RegExpExecArray | null;
  let partIndex = 0;
  while ((partMatch = partRegex.exec(source)) !== null) {
    const [, rawAttributes, content] = partMatch;
    const attributes = parseAttributes(rawAttributes);
    const type = attributes.type ?? "custom";
    parts.push({
      id: generateId("part", partIndex++),
      type,
      attributes,
      content: content.trim(),
    });
  }

  const pageRegex = /<!--siteframe:page([^>]*)-->([\s\S]*?)<!--\/siteframe:page-->/gi;
  let pageMatch: RegExpExecArray | null;
  let pageIndex = 0;
  while ((pageMatch = pageRegex.exec(source)) !== null) {
    const [, rawAttributes, inner] = pageMatch;
    const attributes = parseAttributes(rawAttributes);

    const blocks: SiteframeBlock[] = [];
    const blockRegex = /<!--siteframe:block([^>]*)-->([\s\S]*?)<!--\/siteframe:block-->/gi;
    let blockMatch: RegExpExecArray | null;
    let blockIndex = 0;
    while ((blockMatch = blockRegex.exec(inner)) !== null) {
      const [, rawBlockAttributes, blockContent] = blockMatch;
      const blockAttributes = parseAttributes(rawBlockAttributes);
      const type = blockAttributes.type ?? "html";
      blocks.push({
        id: generateId(`block-${pageIndex}`, blockIndex++),
        type,
        attributes: blockAttributes,
        content: blockContent.trim(),
      });
    }

    pages.push({
      id: generateId("page", pageIndex++),
      attributes,
      blocks,
    });
  }

  return { parts, pages };
};

const serializePart = (part: SiteframePart): string => {
  const { type, attributes, content } = part;
  const nextAttributes = { ...attributes, type };
  const attrString = attributesToString(nextAttributes);
  const attrSection = attrString ? ` ${attrString}` : "";
  return `<!--siteframe:part${attrSection}-->\n${content.trim()}\n<!--/siteframe:part-->`;
};

const serializeBlock = (block: SiteframeBlock): string => {
  const { type, attributes, content } = block;
  const nextAttributes = { ...attributes, type };
  const attrString = attributesToString(nextAttributes);
  const attrSection = attrString ? ` ${attrString}` : "";
  return `    <!--siteframe:block${attrSection}-->\n${content.trim()}\n    <!--/siteframe:block-->`;
};

const serializePage = (page: SiteframePage): string => {
  const attrString = attributesToString(page.attributes);
  const blocks = page.blocks.map(serializeBlock).join("\n");
  const attrSection = attrString ? ` ${attrString}` : "";
  return `<!--siteframe:page${attrSection}-->\n${blocks}\n<!--/siteframe:page-->`;
};

export const serializeSiteframeDocument = (doc: SiteframeDocument): string => {
  const parts = doc.parts.map(serializePart).join("\n\n");
  const pages = doc.pages.map(serializePage).join("\n\n");
  return [parts, pages].filter(Boolean).join("\n\n").trim();
};
