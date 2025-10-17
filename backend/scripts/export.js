const fs = require("fs");
const path = require("path");

async function exportABI() {
  try {
    console.log("Exporting contract ABI...");

    // Source ABI file from compilation artifacts
    const eventManagerArtifact = path.join(
      __dirname,
      "../artifacts/contracts/EventManager.sol/EventManager.json"
    );

    if (!fs.existsSync(eventManagerArtifact)) {
      throw new Error("EventManager artifact not found. Run deployment first.");
    }

    // Read the compiled artifact
    const artifact = JSON.parse(fs.readFileSync(eventManagerArtifact, "utf8"));
    const abi = artifact.abi;

    // Export directories
    const exportPaths = [
      path.join(__dirname, "../shared/EventManagerABI.json"), // Shared volume
      path.join(__dirname, "../EventManagerABI.json"), // Local backup
    ];

    // Ensure shared directory exists
    const sharedDir = path.dirname(exportPaths[0]);
    if (!fs.existsSync(sharedDir)) {
      fs.mkdirSync(sharedDir, { recursive: true });
    }

    // Write ABI to both locations
    exportPaths.forEach((exportPath) => {
      fs.writeFileSync(exportPath, JSON.stringify(abi, null, 2));
      console.log(`✓ ABI exported to: ${exportPath}`);
    });

    console.log("🎉 ABI export completed successfully!");
  } catch (error) {
    console.error("❌ ABI export failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  exportABI();
}

module.exports = { exportABI };
