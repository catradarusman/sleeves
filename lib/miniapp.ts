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

/** Mini app webviews block window.open; the host has to do the opening.
 *  Takes the answer rather than awaiting it: a browser popup has to open in
 *  the same tick as the click that asked for it. */
export function openExternal(url: string, inMiniApp: boolean) {
  if (inMiniApp) {
    void sdk.actions.openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
