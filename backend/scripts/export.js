const fs = require("fs");
const path = require("path");

async function exportABI() {
  try {
    console.log("Exporting contract ABIs...");

    // Contract artifacts to export
    const contractsToExport = [
      {
        name: "EventManager",
        artifactPath: path.join(
          __dirname,
          "../artifacts/contracts/EventManager.sol/EventManager.json"
        ),
        outputFile: "EventManagerABI.json",
      },
      {
        name: "ResaleMarket",
        artifactPath: path.join(
          __dirname,
          "../artifacts/contracts/ResaleMarket.sol/ResaleMarket.json"
        ),
        outputFile: "ResaleMarketABI.json",
      },
      {
        name: "LoyaltyToken",
        artifactPath: path.join(
          __dirname,
          "../artifacts/contracts/LoyaltyPoint.sol/LoyaltyPoint.json"
        ),
        outputFile: "LoyaltyPointABI.json",
      },
      {
        name: "LoyaltySystem",
        artifactPath: path.join(
          __dirname,
          "../artifacts/contracts/LoyaltySystem.sol/LoyaltySystem.json"
        ),
        outputFile: "LoyaltySystemABI.json",
      },
    ];

    // Ensure shared directory exists
    const sharedDir = path.join(__dirname, "../shared");
    if (!fs.existsSync(sharedDir)) {
      fs.mkdirSync(sharedDir, { recursive: true });
    }

    // Export each contract ABI
    for (const contract of contractsToExport) {
      if (!fs.existsSync(contract.artifactPath)) {
        console.warn(
          `⚠️  ${contract.name} artifact not found: ${contract.artifactPath}`
        );
        continue;
      }

      // Read the compiled artifact
      const artifact = JSON.parse(
        fs.readFileSync(contract.artifactPath, "utf8")
      );
      const abi = artifact.abi;

      // Export paths (shared volume and local backup)
      const exportPaths = [
        path.join(sharedDir, contract.outputFile), // Shared volume
        path.join(__dirname, "..", contract.outputFile), // Local backup
      ];

      // Write ABI to both locations
      exportPaths.forEach((exportPath) => {
        fs.writeFileSync(exportPath, JSON.stringify(abi, null, 2));
        console.log(`✓ ${contract.name} ABI exported to: ${exportPath}`);
      });
    }

    console.log("🎉 All contract ABIs exported successfully!");
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
