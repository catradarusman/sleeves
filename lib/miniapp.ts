import { sdk } from '@farcaster/miniapp-sdk'

export async function isInMiniApp(): Promise<boolean> {
  return sdk.isInMiniApp()
}

export async function getMiniAppProvider() {
  return sdk.wallet.getEthereumProvider()
}

export async function callReady() {
  await sdk.actions.ready()
}
