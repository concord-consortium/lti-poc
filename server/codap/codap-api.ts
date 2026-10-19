import fs from "fs"
import path from "path"

import { findResource, CodapTool } from "../catalog/resources"
import { getUserInfo } from "../helpers"
import { loadState, saveState, listStudents, saveAttachment, loadAttachment, resourceLinkKey, userKey } from "./store"

export const codapUrl = process.env.CODAP_URL || "https://codap3.concord.org/"

// Teacher = has an Instructor role, or an Administrator role without a Learner role.
// (The POC's getUserType() treats Administrator as learner for AP; here admins who
// launch from an LMS course are almost always teachers trying things out.)
export const isTeacher = (token: any) => {
  const roles: string[] = token.platformContext?.roles ?? []
  const has = (s: string) => roles.some(r => r.includes(s))
  return has("#Instructor") || (has("#Administrator") && !has("#Learner"))
}

// Load the "source" document for a resource: either a URL or a path under server/public.
const loadSourceDocument = async (tool: CodapTool): Promise<any | null> => {
  if (!tool.documentUrl) return null
  if (tool.documentUrl.startsWith("/")) {
    const p = path.join(__dirname, "..", "public", tool.documentUrl)
    return JSON.parse(fs.readFileSync(p, "utf8"))
  }
  const response = await fetch(tool.documentUrl)
  if (!response.ok) throw new Error(`Could not load source document ${tool.documentUrl}: ${response.status}`)
  return response.json()
}

// ltijs installs body parsers (100 KB limit) before our middleware runs. CODAP
// documents and attachments are bigger than that, so for /codap/* we read the raw
// body ourselves and move that middleware ahead of the parsers. Prototype-only hack:
// production would upload attachments straight to S3 with pre-signed URLs.
const CODAP_MAX_BODY = 20 * 1024 * 1024 // 20 MB; this runs before the ltik check, so it must be bounded
export const installRawBodyForCodap = (app: any) => {
  app.use((req, res, next) => {
    if (!req.path.startsWith("/codap/") || !["POST", "PUT"].includes(req.method)) return next()
    const chunks: Buffer[] = []
    let size = 0
    let done = false
    req.on("data", (c: Buffer) => {
      if (done) return
      size += c.length
      if (size > CODAP_MAX_BODY) {
        done = true
        res.status(413).send({ error: "Payload too large" })
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on("end", () => {
      if (done) return
      done = true
      req.rawBody = Buffer.concat(chunks)
      req.body = {}
      req._body = true // tells body-parser to skip this request
      next()
    })
    req.on("error", (err) => { if (!done) { done = true; next(err) } })
  })
  // move the layer we just added to the front of the router stack (after express's own query/init layers)
  const stack = app._router?.stack
  if (stack) {
    const layer = stack.pop()
    stack.splice(2, 0, layer)
  }
}

export const addCodapRoutes = (lti: any) => {
  const app = lti.app

  // Called by the host page after launch. Tells it who the user is, what to load,
  // and whether saves should be kept.
  // Express 4 does not catch rejected promises from async handlers, and Node exits on
  // unhandled rejections, so a bad documentUrl must not escape this handler.
  app.get("/codap/launch-info", async (req, res) => {
    try {
    const token = res.locals.token
    const resource = findResource(token.platformContext?.custom?.slug)
    if (!resource || resource.tool === "internal" || resource.tool.type !== "codap") {
      return res.status(400).send({ error: "Not a CODAP resource" })
    }
    const tool = resource.tool
    const rlKey = resourceLinkKey(token)
    const teacher = isTeacher(token)
    const studentParam = typeof req.query.student === "string" ? req.query.student : undefined

    // teacher without a student selected: list students
    if (teacher && !studentParam && req.query.preview !== "true") {
      return res.send({
        role: "teacher",
        mode: "list",
        title: resource.title,
        students: listStudents(rlKey).map(s => ({ userId: s.userId, name: s.name, updatedAt: s.updatedAt }))
      })
    }

    // teacher viewing a student's document (read-only), or teacher previewing the source
    if (teacher) {
      const state = studentParam ? loadState(rlKey, userKey(studentParam)) : await loadSourceDocument(tool)
      return res.send({
        role: "teacher",
        mode: "view",
        readOnly: true,
        title: resource.title,
        codapUrl,
        student: studentParam ?? null,
        state
      })
    }

    // student: their own copy, or the source document on first launch
    const uKey = userKey(token.user)
    let state = loadState(rlKey, uKey)
    let firstLaunch = false
    if (state === null) {
      state = await loadSourceDocument(tool)
      firstLaunch = true
    }
    return res.send({
      role: "learner",
      mode: "edit",
      readOnly: false,
      title: resource.title,
      codapUrl,
      firstLaunch,
      state
    })
    } catch (e: any) {
      console.error("codap launch-info failed:", e)
      return res.status(502).send({ error: "Could not load the CODAP document" })
    }
  })

  // Host page posts CODAP's interactive state here on every autosave (students only).
  app.post("/codap/state", (req, res) => {
    const token = res.locals.token
    if (isTeacher(token)) return res.status(403).send({ error: "Teachers do not save" })
    let state: any
    try {
      state = JSON.parse(req.rawBody.toString("utf8"))
    } catch {
      return res.status(400).send({ error: "Body must be JSON" })
    }
    const info = getUserInfo(token)
    const name = info.name || info.email || token.user
    saveState(resourceLinkKey(token), userKey(token.user), token.user, name, state)
    return res.send({ ok: true, bytes: req.rawBody.length })
  })

  // Attachments: CFM PUTs large documents here and GETs them back.
  // Teachers read a student's attachments by passing ?student=<userId>.
  const attachmentOwner = (req, token) => {
    const studentParam = typeof req.query.student === "string" ? req.query.student : undefined
    if (studentParam && !isTeacher(token)) return null
    return studentParam ?? token.user
  }

  app.put("/codap/attachments/:name", (req, res) => {
    const token = res.locals.token
    if (isTeacher(token)) return res.status(403).send({ error: "Teachers do not save" })
    saveAttachment(resourceLinkKey(token), userKey(token.user), req.params.name, req.rawBody)
    return res.send({ ok: true, bytes: req.rawBody.length })
  })

  app.get("/codap/attachments/:name", (req, res) => {
    const token = res.locals.token
    const owner = attachmentOwner(req, token)
    if (!owner) return res.status(403).send({ error: "Forbidden" })
    const content = loadAttachment(resourceLinkKey(token), userKey(owner), req.params.name)
    if (!content) return res.status(404).send({ error: "Not found" })
    res.type("application/json")
    return res.send(content)
  })
}
