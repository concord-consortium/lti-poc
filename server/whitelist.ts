type WhitelistItem = string | { route: RegExp, method: string }
const whitelist: WhitelistItem[] = []

// allows each api endpoint setter to add their own routes to the whitelist
// which is then used to bypass LTI authentication for those routes when the
// server is started

export function addToWhitelist(...items: WhitelistItem[]) {
  whitelist.push(...items)
}

export function getWhitelist() {
  return whitelist
}