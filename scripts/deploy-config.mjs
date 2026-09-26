export function assertExpectedDeployer(actualAddress, expectedAddress) {
  if (!expectedAddress) return;
  const pattern = /^0x[0-9a-fA-F]{40}$/;
  if (!pattern.test(expectedAddress) || /^0x0{40}$/i.test(expectedAddress)) {
    throw new Error("TESTNET_DEPLOYER_ADDRESS must be a non-zero EVM address.");
  }
  if (actualAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error("PRIVATE_KEY does not match TESTNET_DEPLOYER_ADDRESS; refusing to deploy from the wrong wallet.");
  }
}
