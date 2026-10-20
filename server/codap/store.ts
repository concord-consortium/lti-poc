// Prototype document store for CODAP LTI launches.
// Files on disk under server/data/codap/<resourceLinkKey>/<userKey>/.
// Production would use S3 (documents + attachments) plus a small DB table.

import fs from "fs"
import path from "path"
import { createHash } from "crypto"

const dataRoot = path.join(__dirname, "..", "data", "codap")

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 24)

export type StudentRecord = {
  userId: string
  name: string
  updatedAt: string
}

// a resource link is one assignment in one course in one LMS deployment
export const resourceLinkKey = (token: any) =>
  hash(`${token.platformId}|${token.deploymentId}|${token.platformContext?.resource?.id}`)

export const userKey = (userId: string) => hash(userId)

const recordDir = (rlKey: string, uKey: string) => path.join(dataRoot, rlKey, uKey)
const indexPath = (rlKey: string) => path.join(dataRoot, rlKey, "index.json")

const readJson = (p: string, fallback: any) => {
  try { return JSON.parse(fs.readFileSync(p, "utf8")) } catch { return fallback }
}

export const loadState = (rlKey: string, uKey: string): any | null => {
  const p = path.join(recordDir(rlKey, uKey), "state.json")
  return fs.existsSync(p) ? readJson(p, null) : null
}

export const saveState = (rlKey: string, uKey: string, userId: string, name: string, state: any) => {
  const dir = recordDir(rlKey, uKey)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify(state))
  // keep a per-resource-link index so the teacher page can list students
  const index: Record<string, StudentRecord> = readJson(indexPath(rlKey), {})
  index[uKey] = { userId, name, updatedAt: new Date().toISOString() }
  fs.writeFileSync(indexPath(rlKey), JSON.stringify(index, null, 2))
}

export const listStudents = (rlKey: string): Array<StudentRecord & { key: string }> => {
  const index: Record<string, StudentRecord> = readJson(indexPath(rlKey), {})
  return Object.entries(index)
    .map(([key, rec]) => ({ key, ...rec }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// attachments are what CFM writes when a document is >= 400 KiB
const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_")

export const saveAttachment = (rlKey: string, uKey: string, name: string, content: Buffer | string) => {
  const dir = path.join(recordDir(rlKey, uKey), "attachments")
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, safeName(name)), content)
}

export const loadAttachment = (rlKey: string, uKey: string, name: string): Buffer | null => {
  const p = path.join(recordDir(rlKey, uKey), "attachments", safeName(name))
  return fs.existsSync(p) ? fs.readFileSync(p) : null
}

// Teacher-created assignments ("custom CODAP document"): one record per Deep Linking
// response. The LMS launch carries the record id as a custom parameter.
export type AssignmentRecord = {
  id: string
  title: string
  documentUrl: string      // resolved, fetchable URL of the source document ("live": fetched on each first launch)
  originalInput: string    // what the teacher pasted (share link or URL)
  createdBy: string        // LMS user id of the teacher
  createdAt: string
}

const assignmentsDir = path.join(dataRoot, "assignments")

export const saveAssignment = (rec: AssignmentRecord) => {
  fs.mkdirSync(assignmentsDir, { recursive: true })
  fs.writeFileSync(path.join(assignmentsDir, `${rec.id}.json`), JSON.stringify(rec, null, 2))
}

export const loadAssignment = (id: string): AssignmentRecord | null => {
  if (!/^[a-f0-9]{24}$/.test(id)) return null
  const p = path.join(assignmentsDir, `${id}.json`)
  return fs.existsSync(p) ? readJson(p, null) : null
}

export const newAssignmentId = () => hash(`${Date.now()}|${Math.random()}`)
