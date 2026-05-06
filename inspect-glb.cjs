const fs = require('fs');

function readGlbNodes(filePath) {
  const buffer = fs.readFileSync(filePath);
  const chunk0Len = buffer.readUInt32LE(12);
  const jsonString = buffer.toString('utf8', 20, 20 + chunk0Len);
  const json = JSON.parse(jsonString);
  
  console.log(`\n=== ${filePath} ===`);
  const nodes = json.nodes;
  if (!nodes) {
    console.log("No nodes");
    return;
  }
  
  const nodeNames = nodes.map(n => n.name);
  console.log("Total nodes:", nodeNames.length);
  console.log("Sample nodes:");
  console.log(nodeNames.slice(0, 10).join(', '));
  
  // also check if any node has mixamorig or Armature in it
  const armatureNodes = nodeNames.filter(n => n.includes('mixamo') || n.includes('Armature') || n.includes('|'));
  if (armatureNodes.length > 0) {
    console.log("Armature/Mixamo nodes:", armatureNodes.slice(0, 5).join(', '));
  }
}

readGlbNodes('src/assets/MSB-Player-stand.glb');
readGlbNodes('src/assets/MSB-Player-walk.glb');
readGlbNodes('src/assets/MSB-Player-jump.glb');

