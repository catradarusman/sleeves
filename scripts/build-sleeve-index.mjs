import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import fs from "node:fs";

const RPC = "https://base-rpc.publicnode.com";
const SLEEVES = "0x4428be530724b5ee47e4cb0061f77024933a4dc3";
const c = createPublicClient({ chain: base, transport: http(RPC, { timeout: 20000 }) });
const abi = [
  { type:"function", name:"totalSupply", inputs:[], outputs:[{type:"uint256"}], stateMutability:"view" },
  { type:"function", name:"tokenURI", inputs:[{type:"uint256"}], outputs:[{type:"string"}], stateMutability:"view" },
];

const supply = Number(await c.readContract({ address: SLEEVES, abi, functionName: "totalSupply" }));
console.log("minted:", supply);

const ids = Array.from({ length: supply }, (_, i) => i + 1);
const uris = [];
for (let i = 0; i < ids.length; i += 60) {
  const chunk = ids.slice(i, i + 60);
  const res = await c.multicall({ contracts: chunk.map((id) => ({ address: SLEEVES, abi, functionName: "tokenURI", args: [BigInt(id)] })) });
  res.forEach((r, j) => uris.push([chunk[j], r.status === "success" ? r.result : null]));
  process.stdout.write(`uri ${Math.min(i+60, ids.length)}/${ids.length}\r`);
}
console.log();

const out = {};
let done = 0;
for (let i = 0; i < uris.length; i += 12) {
  const batch = uris.slice(i, i + 12);
  await Promise.all(batch.map(async ([id, uri]) => {
    if (!uri) return;
    try {
      const meta = await fetch(uri).then((r) => r.json());
      const second = Number(meta.attributes?.find((a) => a.trait_type === "Second")?.value);
      if (Number.isFinite(second)) out[id] = { second, image: meta.image, name: meta.name };
    } catch {}
  }));
  done += batch.length;
  process.stdout.write(`meta ${done}/${uris.length}\r`);
}
console.log();
fs.writeFileSync("lib/sleeve-index.json", JSON.stringify(out, null, 0));
const seconds = Object.values(out).map((v) => v.second);
console.log("indexed:", Object.keys(out).length, "unique seconds:", new Set(seconds).size, "min/max:", Math.min(...seconds), Math.max(...seconds));
