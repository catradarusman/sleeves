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

/** Mini app webviews block window.open; the host has to do the opening. */
export async function openExternal(url: string) {
  if (await isInMiniApp()) {
    await sdk.actions.openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
