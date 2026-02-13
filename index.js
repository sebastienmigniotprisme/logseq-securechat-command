const settingsSchema = [
  {
    key: "webhookUrl",
    type: "string",
    title: "Webhook URL",
    description: "Prisme.ai SecureChat webhook endpoint URL",
    default: "",
  },
  {
    key: "projectId",
    type: "string",
    title: "Project ID",
    description: "Prisme.ai project identifier",
    default: "",
  },
  {
    key: "apiKey",
    type: "string",
    title: "API Key",
    description: "Prisme.ai API key",
    default: "",
  },
];

function main () {
  logseq.useSettingsSchema(settingsSchema);

  logseq.Editor.registerSlashCommand(
    '⟁ SecureChat',
    async () => {
      const { webhookUrl, projectId, apiKey } = logseq.settings;

      if (!webhookUrl || !projectId || !apiKey) {
        logseq.App.showMsg("SecureChat: Please configure webhook URL, project ID, and API key in plugin settings.", "error");
        return;
      }

      const current = await logseq.Editor.getCurrentBlock();
      const container = await logseq.Editor.getBlock(current.parent.id);
      const target = container || current;

      const { containerContent, blockContent } = await getContentRecursive(target, current.uuid);
      console.log("Block content", blockContent);
      console.log("Container content", containerContent);

      const extract = `${blockContent}`.replace(/\s+/gm," ").slice(0,128);
      logseq.App.showMsg(`
        [:div.p-2
        [:h1 "SecureChat"]
        [:h2.text-xl "${extract}..."]]
      `);

      fetch(webhookUrl,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          projectId: projectId,
          apiKey: apiKey,
          prompt: blockContent + ":\n\n" + containerContent,
        }),
      }).then(r=>r.json())
      .then(async data=>{
        console.log("Response", data);
        const blocks = parseMarkdownToBlocks(data.response);
        await logseq.Editor.insertBatchBlock(current.uuid, blocks, { sibling: false });
      });
    },
  );
}

async function getContentRecursive(block, currentBlockUuid) {
  const containerParts = [];
  let blockContent = "";
  await walkBlock(block, 0, (descendant,level)=>{
    if (descendant.uuid === currentBlockUuid) {
      blockContent = descendant.content;
      return;
    }
    const spaces = "                ".slice(0,level);
    const content = descendant.content;
    containerParts.push(`${spaces}* ${content}`);
  });
  return { containerContent: containerParts.join("\n"), blockContent };
}

async function walkBlock(block, level, callback) {
  callback(block,level);
  for (const childRef of block.children) {
    if(childRef && childRef.length && (childRef.length >= 2) && (childRef[0] == "uuid")) {
      const child = await logseq.Editor.getBlock(childRef[1]);
      walkBlock(child,(level||0)+1,callback);
    }
  }
}

function parseMarkdownToBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code block — collect until closing fence
    if (line.trimStart().startsWith("```")) {
      const codeLines = [line];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        codeLines.push(lines[i]); // closing fence
        i++;
      }
      blocks.push({ content: codeLines.join("\n") });
      continue;
    }

    // List items — collect consecutive list lines, build nested tree
    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s/);
    if (listMatch) {
      const listItems = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s(.*)/);
        if (!m) break;
        listItems.push({ indent: m[1].length, content: m[3] });
        i++;
      }
      blocks.push(...buildListTree(listItems, 0));
      continue;
    }

    // Paragraph — collect consecutive non-empty, non-special lines
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== "" &&
           !lines[i].trimStart().startsWith("```") &&
           !lines[i].match(/^(\s*)([-*]|\d+\.)\s/)) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ content: paraLines.join("\n") });
  }

  return blocks;
}

function buildListTree(items, startIdx) {
  const roots = [];
  let i = startIdx;
  const baseIndent = items.length > 0 ? items[0].indent : 0;

  while (i < items.length) {
    const item = items[i];
    if (item.indent < baseIndent) break;

    if (item.indent === baseIndent) {
      const block = { content: item.content, children: [] };
      roots.push(block);
      i++;
      // Collect children with greater indent
      const childStart = i;
      while (i < items.length && items[i].indent > baseIndent) {
        i++;
      }
      if (childStart < i) {
        block.children = buildListTree(items.slice(childStart, i), 0);
      }
      if (block.children.length === 0) delete block.children;
    } else {
      // Shouldn't reach here, but advance to avoid infinite loop
      i++;
    }
  }
  return roots;
}

// Bootstrap
logseq.ready(main).catch(console.error);

