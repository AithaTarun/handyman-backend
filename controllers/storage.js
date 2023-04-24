const {google} = require('googleapis');
const {Readable} = require('stream');

const UserProfile = require('../models/userProfile');

const oauth2Client = new google.auth.OAuth2
(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  process.env.GOOGLE_DRIVE_REDIRECT_URI,
);

oauth2Client.setCredentials({refresh_token : process.env.GOOGLE_DRIVE_REFRESH_TOKEN});

const googleDrive = google.drive
(
  {
    version: 'v3',
    // auth: process.env.GOOGLE_DRIVE_API_KEY
    auth: oauth2Client
  }
);

exports.uploadSingleFile = async (request, response, next) =>
{
  getUserProfileFolderID(request.user._id)
    .then
    (
      (folderID) =>
      {
        const documentType = request.body.documentType; // avatar (or) aadhaarCard (or) panCard (or) skillCertificate (or) previousEmployerDocuments

        this.deletePreviousVersionFile(request.user._id, documentType)
          .then
          (
            async () =>
            {
              const file = request.files[0];

              const result = await googleDrive.files.create
              (
                {
                  requestBody:
                    {
                      name: file.originalname,
                      mimeType: file.mimetype,
                      parents: [folderID]
                    },

                  media:
                    {
                      mimeType: file.mimetype,

                      body: Readable.from(file.buffer)
                    }
                }
              );

              const fileID = result.data.id;

              createPublicURL(fileID)
                .then
                (
                  async (link) =>
                  {
                    // Saving file ID and public URL in database
                    const databaseResult = await UserProfile.updateOne
                    (
                      {
                        userID: request.user._id
                      },
                      {
                        [documentType]: {id: fileID, url: link}
                      }
                    );

                    // return response.status(200).send({message: `Successfully updated ${documentType.toUpperCase()}`, url: link});
                    return this.fetchProfile(request, response, next);
                  }
                );
            }
          );
      }
    )
    .catch
    (
      (error) =>
      {
        return response.status(500).send({message: "Error while creating/getting user folder ID in drive"});
      }
    )
}

getUserProfileFolderID = async (userID) =>
{
  /*
    Create new user profile folder in drive if not exists, if exists return the drive folder ID which is stored in database.
   */

  try
  {
    const folderID = await UserProfile.findOne
    (
      {
        userID: userID
      },
      {
        driveFolderID: true
      }
    );

    if (folderID['driveFolderID'] !== undefined)
    {
      return folderID.driveFolderID;
    }
    else
    {
      const folderMetaData =
        {
          'name': userID,
          'mimeType': 'application/vnd.google-apps.folder',
          parents: ['1zQrmJXHzg9um8dOsXerZ7ZHSuFQV35-n'] // Handyman folder
        };

      const result = await googleDrive.files.create
      (
        {
          fields: 'id',
          requestBody: folderMetaData
        }
      );

      // Saving user profile drive folder ID
      const updateResult = await UserProfile.updateOne
      (
        {userID: userID},
        {driveFolderID: result.data.id}
      );

      return result.data.id;
    }
  }
  catch (error)
  {
    console.log("Error while creating/getting folder ID : ", error);
    throw new Error("Error while creating/getting folder ID");
  }
}

exports.deletePreviousVersionFile = async (userID, documentType) =>
{
  try
  {
    const file = await UserProfile.findOne
    (
      {
        userID: userID
      },
      {
        [documentType]: true,
        _id: false
      }
    );

    if (file[documentType])
    {
      const fileID = file[documentType].id;

      const result = await googleDrive.files.delete
      (
        {
          fileId: fileID
        }
      );

      const databaseResult = await UserProfile.updateOne
      (
        {
          userID: userID
        },
        {
          [documentType]: null
        }
      );
    }
  }
  catch (error)
  {
    console.log("Error while deleting file : ", error);
    throw new Error("Error while deleting file");
  }
}

createPublicURL = async (fileID) =>
{
  try
  {
    const result = await googleDrive.permissions.create
    (
      {
        fileId: fileID,

        requestBody:
          {
            role: 'reader',
            type: 'anyone'
          }
      }
    );

    const links = await googleDrive.files.get
    (
      {
        fileId: fileID,
        fields: 'webContentLink'
      }
    );

    return links.data.webContentLink;
  }
  catch (error)
  {
    console.log("Error while creating public URL : ", error);
    throw new Error("Error while creating public URL");
  }
}

exports.fetchProfile = async (request, response, next) =>
{
  try
  {
    const profileData = await UserProfile.findOne
    (
      {
        userID: request.user._id
      },
      {
        userID: false,
        driveFolderID: false,
        verified: false
      }
    );

    let buffers = {};

    Promise.all
    (
      [
      getDocument('aadhaarCard', profileData, buffers),
      getDocument('panCard', profileData, buffers),
      getDocument('skillCertificates', profileData, buffers),
      getDocument('previousEmployerDocuments', profileData, buffers)
        ]
    )
      .then
      (
        (result) =>
        {
          return response.status(200).send({"message" : "Successfully fetched profile", profile: profileData, buffers});
        }
      );
  }
  catch (error)
  {
    console.log("Error while fetching profile : ", error);
    return response.status(500).send({"message" : "Error while fetching profile"});
  }
}

getDocument = async (documentType, profileData, buffers) =>
{
  if (profileData[documentType] !== undefined)
  {
    const file = await googleDrive.files.get
    (
      {
        fileId: profileData[documentType].id,
        alt: 'media'
      },
      {
        responseType: 'arraybuffer'
      }
    );

    buffers[documentType] = new Buffer.from(file.data);
  }
}

exports.updateSkills = async (request, response, next) =>
{
  try
  {
    const databaseResult = await UserProfile.updateOne
    (
      {
        userID: request.user._id
      },
      {
        skills: request.body.skills
      }
    );

    return response.status(200).send({"message" : "Successfully updated skills"});
  }
  catch (error)
  {
    console.log("Error while updating skills : ", error);
    return response.status(500).send({"message" : "Error while updating skills"});
  }
}


