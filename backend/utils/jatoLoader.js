const fs = require("fs");
const path = require("path");

let cachedDataset = null;

function loadJatoDataset() {
  if (cachedDataset) return cachedDataset;

  const part1Path = path.join(__dirname, "../data/vehicles-part1.json");
  const part2Path = path.join(__dirname, "../data/vehicles-part2.json");

  const part1 = JSON.parse(fs.readFileSync(part1Path, "utf8"));
  const part2 = JSON.parse(fs.readFileSync(part2Path, "utf8"));

  cachedDataset = [...part1, ...part2];
  console.log(
    `✅ Loaded merged JATO dataset: ${cachedDataset.length} vehicles`
  );

  return cachedDataset;
}

module.exports = { loadJatoDataset };
