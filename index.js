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
      .then(data=>{
        console.log("Response", data);
        logseq.Editor.updateBlock(current.uuid, data.response);
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

// Bootstrap
logseq.ready(main).catch(console.error);

