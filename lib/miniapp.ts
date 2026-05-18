import { sdk } from '@farcaster/miniapp-sdk'

export async function isInMiniApp(): Promise<boolean> {
  try {
    await sdk.context
    return true
  } catch {
    return false
  }
}

export async function getMiniAppProvider() {
  return sdk.wallet.getEthereumProvider()
}

export async function callReady() {
  await sdk.actions.ready()
}
