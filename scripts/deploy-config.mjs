export function assertExpectedDeployer(actualAddress, expectedAddress, networkName = "deployment") {
  if (!expectedAddress) return;
  const pattern = /^0x[0-9a-fA-F]{40}$/;
  if (!pattern.test(expectedAddress) || /^0x0{40}$/i.test(expectedAddress)) {
    throw new Error(`${networkName.toUpperCase()}_DEPLOYER_ADDRESS must be a non-zero EVM address.`);
  }
  if (actualAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(`${networkName.toUpperCase()}_PRIVATE_KEY does not match ${networkName.toUpperCase()}_DEPLOYER_ADDRESS; refusing to deploy from the wrong wallet.`);
  }
}

export function getTimelockMinDelay(networkName, env) {
  const key = networkName === "mainnet" ? "MAINNET_TIMELOCK_DELAY_SECONDS" : "SCRIT_TIMELOCK_DELAY_SECONDS";
  const configured = env[key];
  if (networkName === "mainnet" && configured === undefined) {
    throw new Error(`Set ${key} explicitly; mainnet must not inherit the testnet timelock delay.`);
  }
  const value = configured ?? "0";
  if (!/^\d+$/.test(value)) throw new Error(`${key} must be a non-negative integer number of seconds.`);
  return BigInt(value);
}
