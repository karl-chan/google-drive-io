/* eslint-disable camelcase */
import { createReadStream } from 'fs'
import { drive_v3, google } from 'googleapis'
import { OAuth2Client } from 'googleapis-common'
import path from 'path'

const drive = google.drive('v3')

/**
 * Attempts to fetch a google drive folder with path specified.
 * Returns Google Drive file resource object if exists, otherwise err via callback(err, folder).
 * @param  folderPath folder path to search for
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @returns the Google Drive folder resource object
 */
export async function getFolder (folderPath: string, returnFields: string, auth: OAuth2Client): Promise<drive_v3.Schema$File> {
  const rootFolder = await getRootFolder(returnFields, auth)
  // Base case: reached root folder
  if (folderPath === '.' || folderPath === '/') {
    return rootFolder
  }
  // Recursive case
  return _getFolderRecursive(rootFolder, folderPath, returnFields, auth)
}

/**
 * Attempts to fetch the root directory in google drive.
 * Returns Google Drive file resource object if exists, otherwise err via callback(err, folder).
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @returns the Google Drive folder resource object
 */
export async function getRootFolder (returnFields: string, auth: OAuth2Client): Promise<drive_v3.Schema$File> {
  const res = await drive.files.get({
    auth,
    fileId: 'root',
    fields: returnFields
  })
  return res.data
}

async function _getFolderRecursive (parent: drive_v3.Schema$File, childPath: string | undefined, returnFields: string, auth: OAuth2Client): Promise<drive_v3.Schema$File> {
  // Base case - empty folder with known parent
  if (childPath === undefined) {
    return parent
  }
  // Recursive case
  const [head, tail] = _splitPath(childPath)

  const res = await drive.files.list({
    auth,
    q: `'${parent.id}' in parents and name='${head}' and mimeType='application/vnd.google-apps.folder' 
             and trashed=false`,
    fields: `files(${returnFields})`,
    spaces: 'drive'
  })
  if (!res?.data?.files?.length) {
    throw new Error(`Folder ${head} not found`)
  }

  if (res.data.files.length > 1) {
    console.warn(`Found ${res.data.files.length} duplicate folders of name ${head}`)
  }
  // Found the folder we want, set its id to parent and recurse
  const folder = res.data.files[0]
  return _getFolderRecursive(folder, tail, returnFields, auth)
}

/**
 * Attempts to fetch a google drive file with path specified.
 * Returns Google Drive file resource object if exists, otherwise err via callback(err, folder).
 * @param  filePath file path to search for
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @returns the Google Drive file resource object
 */
export async function getFile (filePath: string, returnFields: string, auth: OAuth2Client): Promise<drive_v3.Schema$File> {
  const parentPath = path.dirname(filePath)
  const childPath = path.basename(filePath)

  const parentFolder = await getFolder(parentPath, returnFields, auth)
  const res = await drive.files.list({
    auth,
    q: `'${parentFolder.id}' in parents and name='${childPath}' and trashed=false`,
    fields: `files(${returnFields})`,
    spaces: 'drive'
  })
  if (!res?.data?.files?.length) {
    throw new Error(`File ${filePath} not found`)
  }

  if (res.data.files.length > 1) {
    console.warn(`Found ${res.data.files.length} duplicate files of name ${childPath}`)
  }
  // Found the file we want
  const file = res.data.files[0]
  return file
}

/**
 * Creates a google drive folder with path specified.
 * @param  folderPath folder path to search for / create if not exists
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @returns the Google Drive folder resource object
 */
export async function createFolder (folderPath: string, returnFields: string, auth: OAuth2Client): Promise<drive_v3.Schema$File> {
  const parentPath = path.dirname(folderPath)
  const childPath = path.basename(folderPath)

  // Create parent folder first if not exists, then create child folder
  const parentFolder = await createFolderIfNotExists(parentPath, returnFields, auth)
  const res = await drive.files.create({
    auth,
    requestBody: {
      name: childPath,
      parents: [parentFolder.id!!],
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: returnFields
  })
  return res.data
}

/** See documentation for createFolder. */
export async function createFolderIfNotExists (folderPath: string, returnFields: string, auth: OAuth2Client): Promise<drive_v3.Schema$File> {
  const folder = await getFolder(folderPath, returnFields, auth)
  // If folder already exists, simply return
  if (folder) {
    return folder
  }
  return createFolder(folderPath, returnFields, auth)
}

/**
 * Upload a file to google drive.
 * @param  filePath path to local file object
 * @param  uploadPath path to upload to in Google Drive
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @returns the Google Drive file resource object of the uploaded file
 */
export async function uploadFile (filePath: string, uploadPath: string, returnFields: string, auth: OAuth2Client): Promise<drive_v3.Schema$File> {
  const parentPath = path.dirname(uploadPath)
  const parentFolder = await createFolderIfNotExists(parentPath, returnFields, auth)
  const res = await drive.files.create({
    auth,
    requestBody: {
      name: path.basename(filePath),
      parents: [parentFolder.id!!]
    },
    media: {
      body: createReadStream(filePath)
    },
    fields: returnFields
  })
  return res.data
}

/** See documentation for uploadFile. */
export async function uploadFileIfNotExists (filePath: string, uploadPath: string, returnFields: string, auth: OAuth2Client): Promise<drive_v3.Schema$File> {
  const existingFile = await getFile(uploadPath, returnFields, auth)
  if (existingFile) {
    return existingFile
  }
  return uploadFile(filePath, uploadPath, returnFields, auth)
}

/**
 * Splits a path into [head, tail], where head is the top level folder, and tail the remaining path.
 * @param  filePath file path as string
 * @return [head, tail] where head is string path to top level folder, tail is remaining string path
 */
function _splitPath (filePath: string): [string, string| undefined] {
  const parts = filePath.split(path.sep)
  const head = parts[0]
  const tailArr = parts.slice(1)
  const tail = tailArr.length ? tailArr.join(path.sep) : undefined // string
  return [head, tail]
}
