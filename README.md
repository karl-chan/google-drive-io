# google-drive-io

Node.js library that makes file access in Google Drive easy.

## Abstract
The official Google Drive API requires fetching of files by their id.  This is particular problematic when manipulating files/folders with directory structures (as recursion is often required).  This library provides convenience methods that can retrieve / insert files based on their paths.

## Methods

This library exposes a number of utility methods that aid file IO in Google Drive:

* `getFolder (folderPath, returnFields, auth)`
   
   ```
   Attempts to fetch a google drive folder with path specified.
   Returns Google Drive file resource object if exists, otherwise err via callback(err, folder).
   @param  folderPath folder path to search for
   @param  returnFields fields in Google file resource to return (comma separated)
   @param  auth OAuth2 client for accessing user's Google Drive
   @returns the Google Drive folder resource object
   ```

* `getRootFolder (returnFields, auth)`

   ```
   Attempts to fetch the root directory in google drive.
   Returns Google Drive file resource object if exists, otherwise err via callback(err, folder).
   @param  returnFields fields in Google file resource to return (comma separated)
   @param  auth OAuth2 client for accessing user's Google Drive
   @returns the Google Drive file resource object
   ```

* `getFile(filePath, returnFields, auth)`

   ```
   Attempts to fetch a google drive file with path specified.
   Returns Google Drive file resource object if exists, otherwise err via callback(err, folder).
   @param  filePath file path to search for
   @param  returnFields fields in Google file resource to return (comma separated)
   @param  auth OAuth2 client for accessing user's Google Drive
   @returns the Google Drive folder resource object
   ```

* `createFolder(folderPath, returnFields, auth)`

   ```
   Creates a google drive folder with path specified.
   @param  folderPath folder path to search for / create if not exists
   @param  returnFields fields in Google file resource to return (comma separated)
   @param  auth OAuth2 client for accessing user's Google Drive
   @returns the Google Drive folder resource object
   ```

* `createFolderIfNotExists(folderPath, returnFields, auth)`

   ```
   See documentation for `createFolder`.
   ```

* `uploadFile(filePath, uploadPath, returnFields, auth)`

   ```
   Upload a file to google drive.
   @param  filePath path to local file object
   @param  uploadPath path to upload to in Google Drive
   @param  returnFields fields in Google file resource to return (comma separated)
   @param  auth OAuth2 client for accessing user's Google Drive
   @returns the Google Drive file resource object of the uploaded file
   ```

* `uploadFileIfNotExists(filePath, uploadPath, returnFields, auth)`

   ```
   See documentation for `uploadFile`.
   ```