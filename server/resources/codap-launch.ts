// Launch handler for CODAP resources: hand off to the host page, which embeds CODAP
// and talks to it over the LARA interactive API (iframe-phone).
export const codapLaunch = (res: any) => {
  return res.redirect(`/codap-host.html?ltik=${encodeURIComponent(res.locals.ltik)}`)
}
