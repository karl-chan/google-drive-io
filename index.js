module.exports = {
    getRootFolder: getRootFolder,
    getFolder: getFolder,
    getFile: getFile,
    createFolder: createFolder,
    createFolderIfNotExists: createFolderIfNotExists,
    uploadFile: uploadFile,
    uploadFileIfNotExists: uploadFileIfNotExists
}

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

/**
 * Attempts to fetch a google drive folder with path specified.
 * Returns Google Drive file resource object if exists, otherwise err via callback(err, folder).
 * @param  folderPath folder path to search for
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @param  callback(err, folder) where folder is the Google Drive folder resource object
 */
function getFolder(folderPath, returnFields, auth, callback) {
    getRootFolder(returnFields, auth, (err, rootFolder) => {
        if (err) {
            return callback(err);
        }
        // Base case: reached root folder
        if (folderPath == '.' || folderPath == '/') {
            return callback(null, rootFolder);
        }
        // Recursive case
        return _getFolderRecursive(rootFolder, folderPath, returnFields, auth, callback);
    })
}

/**
 * Attempts to fetch the root directory in google drive.
 * Returns Google Drive file resource object if exists, otherwise err via callback(err, folder).
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @param  callback(err, folder) where folder is the Google Drive folder resource object
 */
function getRootFolder(returnFields, auth, callback) {
    google.drive('v3').files.get({
        auth: auth,
        fileId: 'root',
        fields: returnFields,
        spaces: 'drive'
    }, (err, res) => {
        if (err) {
            return callback(err);
        }
        return callback(null, res.data);
    }); 
}

function _getFolderRecursive(parent, childPath, returnFields, auth, callback) {
    // Base case - empty folder with known parent
    if (_.isEmpty(childPath)) {
        return callback(null, parent);
    }
    // Recursive case
    const [head, tail] = _splitPath(childPath);

    google.drive('v3').files.list({
        auth: auth,
        q: `'${parent.id}' in parents and name='${head}' and mimeType='application/vnd.google-apps.folder' 
             and trashed=false`,
        fields: `files(${returnFields})`,
        spaces: 'drive'
    }, (err, res) => {
        if (err) {
            return callback(err);
        } else if (res.data.files.length == 0) {
            return callback(new Error(`Folder ${head} not found`));
        }

        if (res.data.files.length > 1) {
            console.warn(new Error(`Found ${res.data.files.length} duplicate folders of name ${head}`));
        }
        // Found the folder we want, set its id to parent and recurse
        const folder = res.data.files[0];
        return _getFolderRecursive(folder, tail, returnFields, auth, callback);
    });    
}

/**
 * Attempts to fetch a google drive file with path specified.
 * Returns Google Drive file resource object if exists, otherwise err via callback(err, folder).
 * @param  filePath file path to search for
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @param  callback(err, folder) where file is the Google Drive file resource object
 */
function getFile(filePath, returnFields, auth, callback) {
    const parentPath = path.dirname(filePath);     
    const childPath = path.basename(filePath);

    getFolder(parentPath, returnFields, auth, (err, parentFolder) => {
        if (err) {
            return callback(err);
        }
        google.drive('v3').files.list({
            auth: auth,
            q: `'${parentFolder.id}' in parents and name='${childPath}' and trashed=false`,
            fields: `files(${returnFields})`,
            spaces: 'drive'
        }, (err, res) => {
            if (err) {
                return callback(err);
            } else if (res.data.files.length == 0) {
                return callback(new Error(`File ${filePath} not found`));
            }

            if (res.data.files.length > 1) {
                console.warn(new Error(`Found ${res.data.files.length} duplicate files of name ${childPath}`));
            }
            // Found the file we want
            const file = res.data.files[0];
            return callback(null, file);
        });
    });
}

/**
 * Creates a google drive folder with path specified.
 * @param  folderPath folder path to search for / create if not exists
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @param  err, folder where folder is the Google Drive folder resource object
 */
function createFolder(folderPath, returnFields, auth, callback) {
    const parentPath = path.dirname(folderPath);     
    const childPath = path.basename(folderPath);

    // Create parent folder first if not exists, then create child folder
    createFolderIfNotExists(parentPath, returnFields, auth, (err, parentFolder) => {
        if (err) {
            return callback(err);
        }
        google.drive('v3').files.create({
            auth: auth,
            resource: {
                name: childPath,
                parents: [ parentFolder.id ],
                mimeType: 'application/vnd.google-apps.folder'
            },
            fields: returnFields
        }, (err, res) => {
            if (err) {
                return callback(err);
            }
            return callback(null, res.folder);
        });
    });    
}

/** See documentation for createFolder. */
function createFolderIfNotExists(folderPath, returnFields, auth, callback) {
    getFolder(folderPath, returnFields, auth, (err, folder) => {
        // If folder already exists, simply return
        if (folder) {
            return callback(null, folder);
        }
        return createFolder(folderPath, returnFields, auth, callback);     
    });
}

/**
 * Upload a file to google drive.
 * @param  filePath path to local file object
 * @param  uploadPath path to upload to in Google Drive
 * @param  returnFields fields in Google file resource to return (comma separated)
 * @param  auth OAuth2 client for accessing user's Google Drive
 * @param  callback(err, newFile) where newFile is Google Drive file resource object of the uploaded file
 */
function uploadFile(filePath, uploadPath, returnFields, auth, callback) {
    const parentPath = path.dirname(uploadPath);
    createFolderIfNotExists(parentPath, returnFields, auth, (err, parentFolder) => {
        if (err) {
            return callback(err);
        }
        google.drive('v3').files.create({
            auth: auth,
            resource: {
                name: path.basename(filePath),
                parents: [ parentFolder.id ]
            },
            media: {
                body: fs.createReadStream(filePath)
            },
            fields: returnFields
        }, (err, res) => {
            if (err) {
                return callback(err);
            }
            return callback(err, res.data);
        });
    });
}

/** See documentation for uploadFile. */
function uploadFileIfNotExists(filePath, uploadPath, returnFields, auth, callback) {
    getFile(uploadPath, returnFields, auth, (err, existingFile) => {
        if (existingFile) {
            return callback(null, existingFile);
        }
        return uploadFile(filePath, uploadPath, returnFields, auth, callback);
    });
}

/** 
 * Splits a path into [head, tail], where head is the top level folder, and tail the remaining path.
 * @param  filePath file path as string
 * @return [head, tail] where head is string path to top level folder, tail is remaining string path
 */
const _splitPath = (filePath) => {
    const parts = filePath.split(path.sep);
    const head = _.head(parts);
    const tailArr = _.tail(parts); // array of parts
    const tail = tailArr.length? tailArr.join(path.sep): null; //string
    return [head, tail];
}
