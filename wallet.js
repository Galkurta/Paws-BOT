const TonWeb = require("tonweb");
const tonMnemonic = require("tonweb-mnemonic");
const fs = require("fs").promises;
const readline = require("readline");

function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function generateTONWallet() {
  try {
    const tonweb = new TonWeb();
    const words = await tonMnemonic.generateMnemonic();
    const seed = await tonMnemonic.mnemonicToSeed(words);
    const keyPair = TonWeb.utils.keyPairFromSeed(seed);

    const WalletClass = tonweb.wallet.all["v4R2"];
    const wallet = new WalletClass(tonweb.provider, {
      publicKey: keyPair.publicKey,
    });

    const address = await wallet.getAddress();
    let addressString = address.toString({ bounceable: true });
    addressString = addressString.replace(/\+/g, "-").replace(/\//g, "_");

    return {
      mnemonic: words.join(" "),
      address: addressString,
      publicKey: TonWeb.utils.bytesToHex(keyPair.publicKey),
      secretKey: TonWeb.utils.bytesToHex(keyPair.secretKey),
    };
  } catch (error) {
    throw new Error(`Error generating wallet: ${error.message}`);
  }
}

async function generateBulkWallets(count) {
  const wallets = [];
  const addresses = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const detailsFileName = `wallets_details_${timestamp}.txt`;
  const addressesFileName = `wallet.txt`;

  console.log(`\nStarting generation of ${count} wallet(s)...`);

  try {
    for (let i = 0; i < count; i++) {
      const wallet = await generateTONWallet();
      wallets.push(wallet);
      addresses.push(wallet.address);

      if ((i + 1) % 10 === 0 || i === count - 1) {
        console.log(`Generated ${i + 1}/${count} wallet(s)`);
      }
    }

    const detailsContent = wallets
      .map((wallet, index) => {
        return (
          `Wallet #${index + 1}\n` +
          `Address: ${wallet.address}\n` +
          `Mnemonic: ${wallet.mnemonic}\n` +
          `Public Key: ${wallet.publicKey}\n` +
          `Secret Key: ${wallet.secretKey}\n` +
          "-".repeat(50) +
          "\n"
        );
      })
      .join("\n");

    const addressesContent = addresses.join("\n");

    await fs.writeFile(detailsFileName, detailsContent);
    await fs.writeFile(addressesFileName, addressesContent);

    console.log("\nGeneration completed successfully!");
    console.log(`Full details saved to: ${detailsFileName}`);
    console.log(`Addresses only saved to: ${addressesFileName}`);
  } catch (error) {
    console.error("Error during bulk generation:", error);
    throw error;
  }
}

async function main() {
  try {
    console.log("TON Wallet Generator");
    console.log("===================");

    let numberOfWallets;
    while (true) {
      const input = await promptUser(
        "Enter the number of wallets to generate: "
      );
      numberOfWallets = parseInt(input);

      if (isNaN(numberOfWallets) || numberOfWallets <= 0) {
        console.log("Please enter a valid positive number.");
        continue;
      }

      if (numberOfWallets > 100) {
        const confirm = await promptUser(
          `You are about to generate ${numberOfWallets} wallets. This might take some time. Continue? (y/n): `
        );
        if (confirm.toLowerCase() !== "y") {
          console.log("Operation cancelled.");
          process.exit(0);
        }
      }

      break;
    }

    await generateBulkWallets(numberOfWallets);
  } catch (error) {
    console.error("Main program error:", error);
  }
}

main();
